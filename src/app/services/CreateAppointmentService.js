import { parseISO, startOfHour, isBefore, format } from 'date-fns';
import pt from 'date-fns/locale/pt';

import User from '../models/User';
import Appointment from '../models/Appointment';
import Notification from '../schemas/Notification';

class CreateAppointmentService {
  async run({ provider_id, user_id, date }) {
    /**
     * Check if provider_id is a provider (se o usuario é um barbeiro, por exemplo, e não um usuário comum).
     */
    const isProvider = await User.findOne({
      where: { id: provider_id, provider: true },
    });

    /**
     * Verificando se um provider está tentando marcar um agendamento para ele mesmo.
     */
    if (provider_id === user_id) {
      throw new Error("You don't create appointments for yourself");
    }

    if (!isProvider) {
      throw new Error('You can only create appointments with providers');
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
      throw new Error('Past dates are not permitted');
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
      throw new Error('Appointment date is not available');
    }

    const appointment = await Appointment.create({
      user_id,
      provider_id,
      date: hourStart,
    });

    /**
     * (Notify appointment provider - Notificar prestador de servico.
     */

    const user = await User.findByPk(user_id);

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

    return appointment;
  }
}

export default new CreateAppointmentService();
