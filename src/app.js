import 'dotenv/config';

import express from 'express';
import helmet from 'helmet';
import path from 'path';
import * as Sentry from '@sentry/node';
import cors from 'cors';
import Youch from 'youch';
import 'express-async-errors'; // tem que vim antes da importacao das rotas, para que as rotas tenham o asyn error integrado.
import routes from './routes';
import sentryConfig from './config/sentry';

import './database';

class App {
  constructor() {
    this.server = express();

    Sentry.init(sentryConfig);

    this.middlewares();
    this.routes();
    this.exceptionHandler();
  }

  middlewares() {
    // The request handler must be the first middleware on the app
    this.server.use(Sentry.Handlers.requestHandler());

    // Para permitir que outras aplicações utilizem a API.
    this.server.use(helmet());
    this.server.use(cors());
    this.server.use(express.json());

    // Esse recurso do express (o static) permite abrir arquivos/imagens no navegador.
    this.server.use(
      '/files',
      express.static(path.resolve(__dirname, '..', 'tmp', 'uploads'))
    );
  }

  routes() {
    this.server.use(routes);
    this.server.use(Sentry.Handlers.errorHandler());
  }

  exceptionHandler() {
    // o express sabe automaticamente que quando um middleware recebe quatro parametros, é porque ele é um middleware de tratamento de excessoes.
    this.server.use(async (err, req, res, next) => {
      // Só vou captura erro com o Youch em ambiente de desenvolvimento.
      if (process.env.NODE_ENV === 'development') {
        const errors = await new Youch(err, req).toJSON();
        return res.status(500).json(errors);
      }

      return res.status(500).json({ error: 'Internal server error' });
    });
  }
}

export default new App().server;
