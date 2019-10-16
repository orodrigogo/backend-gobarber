import Sequelize, { Model } from 'sequelize';

class File extends Model {
  static init(sequelize) {
    super.init(
      {
        name: Sequelize.STRING,
        path: Sequelize.STRING,
        url: {
          type: Sequelize.VIRTUAL,
          get() {
            return `http://localhost:3333/files/${this.path}`; // Get para manipular o valor antes de exibir.
          },
        }, // campo virtual: não existe na tabela, somente aqui em memoria.
      },
      {
        sequelize,
      }
    );

    // Retorna o model que acabou de ser inicializado.
    return this;
  }
}

export default File;
