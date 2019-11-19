import User from '../models/User';
import File from '../models/File';

import Cache from '../../lib/Cache';

class ProviderController {
  async index(req, res) {
    /*
      Verificando se a lista de providers está armazenada no cache antes de ir buscar no banco de dados.
    */
    const cached = await Cache.get('providers');

    if (cached) {
      return res.json(cached);
    }

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

    // armazenando no cache.
    await Cache.set('providers', providers);

    return res.json(providers);
  }
}

export default new ProviderController();
