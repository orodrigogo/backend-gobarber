import { isBefore, subHours } from 'date-fns';

import User from '../models/User';
import Appointment from '../models/Appointment';

import Queue from '../../lib/Queue';
import CancellationMail from '../jobs/CancellationMail';

class CancelAppointmentServices {
  async run({ provider_id, user_id }) {
    const appointment = await Appointment.findByPk(provider_id, {
      include: [
        { model: User, as: 'provider', attributes: ['name', 'email'] },
        { model: User, as: 'user', attributes: ['name'] },
      ],
    });

    if (appointment.user_id !== user_id) {
      throw new Error("You don't have permissition to cancel this appointment");
    }

    /**
     * O usuario só vai poder cancelar um agendamento duas horas antes.
     */
    const dateWithSub = subHours(appointment.date, 2); // removendo menos duas horas com  o subHours do date-fns (que reduz a quantidade de uma hora).

    if (isBefore(dateWithSub, new Date())) {
      throw new Error('You can only cancel appoiments 2 hours in advance');
    }

    appointment.canceled_at = new Date();
    await appointment.save();

    await Queue.add(CancellationMail.key, {
      appointment,
    });

    return appointment;
  }
}

export default new CancelAppointmentServices();
