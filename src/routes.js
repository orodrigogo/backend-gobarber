import { Router } from 'express';

import UserController from './app/controllers/UserController';
import SessionController from './app/controllers/SessionController';

import authMiddleware from './app/middlewares/auth';

const routes = new Router();

routes.post('/users', UserController.store);
routes.post('/sessions', SessionController.store);

// Neste caso, o Middleware de Autenticação só vai funcionar para as rotas que estão abaixo dele.
routes.use(authMiddleware);
routes.put('/users', UserController.update);

export default routes;
