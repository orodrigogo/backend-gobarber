import jwt from 'jsonwebtoken';
import { promisify } from 'util'; // Nativo do Node, para permitir usar async await em uma funcao de callback.

import authConfig from '../../config/auth';

export default async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Token not provided' });
  }

  /* O authHeader retorna o Beare que é o tipo da autenticação + token. O Split
  vai separar em array pelo espaço. Mas com a , digo que quero somente a primeira
  posição do array que é o token.
  */
  const [, token] = authHeader.split(' ');

  try {
    const decoded = await promisify(jwt.verify)(token, authConfig.secret);

    // Incluind o Id do usuario autenticado na requisicao que chamou o Middleawe de autenticação.
    req.userId = decoded.id;
  } catch (err) {
    return res.status(401).json({ error: 'Token invalid' });
  }

  return next();
};
