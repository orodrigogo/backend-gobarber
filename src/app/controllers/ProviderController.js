import User from '../models/User';
import File from '../models/File';

class ProviderController {
  async index(req, res) {
    const providers = await User.findAll({
      where: { provider: true },
      attributes: ['id', 'name', 'avatar_id'], // attributes: define quais campos a consulta deve retornar da tabela.
      include: [
        {
          model: File,
          as: 'avatar',
          attributes: ['name', 'path', 'url'],
        },
      ], // include: traz o relacionamento.
    });

    return res.json(providers);
  }
}

export default new ProviderController();
