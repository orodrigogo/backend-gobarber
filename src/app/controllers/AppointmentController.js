import * as Yup from 'yup';
import { startOfHour, parseISO, isBefore, format, subHours } from 'date-fns';
import pt from 'date-fns/locale/pt'; // Para colocar mês traduzido na formatação.
import Appointment from '../models/Appointment';
import User from '../models/User';
import File from '../models/File';
import Notification from '../schemas/Notification';

import CancelationMail from '../jobs/CancellationMail';
import Queue from '../../lib/Queue';

class AppointmentController {
  async index(req, res) {
    // Passando o valor padrão 1. Caso nenhum número de paginação seja criado.
    const { page = 1 } = req.query;

    const appointment = await Appointment.findAll({
      where: { user_id: req.userId, canceled_at: null },
      order: ['date'],
      attributes: ['id', 'date', 'past', 'cancelable'],
      limit: 20, // Limite para listar no máximo 20 registros para fazer a páginação.
      offset: (page - 1) * 20, // Quantos registros eu quero pular: pula 20 registros e mostra os próximos 20.
      // Fazendo o relacionamento.
      include: [
        {
          model: User,
          as: 'provider',
          attributes: ['id', 'name'],
          include: [
            {
              model: File,
              as: 'avatar',
              attributes: ['id', 'path', 'url'],
            },
          ],
        },
      ],
    });

    return res.json(appointment);
  }

  async store(req, res) {
    const schema = Yup.object().shape({
      provider_id: Yup.number().required(),
      date: Yup.date().required(),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Validation fails' });
    }

    const { provider_id, date } = req.body;

    /**
     * Check if provider_id is a provider (se o usuario é um barbeiro, por exemplo, e não um usuário comum).
     */
    const isProvider = await User.findOne({
      where: { id: provider_id, provider: true },
    });

    /**
     * Verificando se um provider está tentando marcar um agendamento para ele mesmo.
     */
    if (provider_id === req.userId) {
      return res
        .status(401)
        .json({ error: "You don't create appointments for yourself" });
    }

    if (!isProvider) {
      return res
        .status(401)
        .json({ error: 'You can only create appointments with providers' });
    }

    /**
     * parseISO: transforma a data em um objetivo do tipo Date do JavaScript.
     * startOfHour: pega apenas o inicio da hora, e não minutos e segundos.
     */
    const hourStart = startOfHour(parseISO(date));

    /**
     * isBefore: (Check for past dates) usando para verificar se o usuário não está tentando agendar com uma data antes da data atual.
     */
    if (isBefore(hourStart, new Date())) {
      return res.status(400).json({ error: 'Past dates are not permitted' });
    }

    /**
     * (Check date availability) Verificando se o prestador de serviço já tem um serviço agendado no horário pretendido.
     */
    const checkAvailability = await Appointment.findOne({
      where: {
        provider_id,
        canceled_at: null,
        date: hourStart,
      },
    });

    if (checkAvailability) {
      return res
        .status(400)
        .json({ error: 'Appointment date is not available' });
    }

    const appointment = await Appointment.create({
      user_id: req.userId,
      provider_id,
      date: hourStart,
    });

    /**
     * (Notify appointment provider - Notificar prestador de servico.
     */

    const user = await User.findByPk(req.userId);

    // Formatando a data para exibir na notificação (o data-fns nao vai trocar o d dentro de aspas simples pelo dia, mantendo o texto).
    const formattedDate = format(
      hourStart,
      "'dia' dd 'de' MMMM', às' H:mm'h'",
      { locale: pt }
    );

    await Notification.create({
      content: `Novo agendamento de ${user.name} para o ${formattedDate}`,
      user: provider_id,
    });

    return res.json(appointment);
  }

  async delete(req, res) {
    const appointment = await Appointment.findByPk(req.params.id, {
      include: [
        { model: User, as: 'provider', attributes: ['name', 'email'] },
        { model: User, as: 'user', attributes: ['name'] },
      ],
    });

    if (appointment.user_id !== req.userId) {
      return res.status(401).json({
        error: "You don't have permissition to cancel this appointment",
      });
    }

    /**
     * O usuario só vai poder cancelar um agendamento duas horas antes.
     */
    const dateWithSub = subHours(appointment.date, 2); // removendo menos duas horas com  o subHours do date-fns (que reduz a quantidade de uma hora).

    if (isBefore(dateWithSub, new Date())) {
      return res.status(401).json({
        error: 'You can only cancel appoiments 2 hours in advance',
      });
    }

    appointment.canceled_at = new Date();
    await appointment.save();

    await Queue.add(CancelationMail.key, {
      appointment,
    });

    return res.json(appointment);
  }
}

export default new AppointmentController();
