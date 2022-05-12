const { SlashCommandBuilder } = require("@discordjs/builders");
const { ECS } = require("../system");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dm_player_tp')
        .setDescription('Téléporte un joueur dans la pièce spécifiée.')
        .addUserOption(option => option.setName('user')
            .setDescription('Joueur à téléporter.')
            .setRequired(true))
        .addChannelOption(option => option.setName('destination')
            .setDescription('Pièce où téléporter le joueur.')
            .setRequired(true)),

    async execute(game, interaction) {
        let replyMessage = '❗ Seul le Maître du Donjon peut utiliser cette commande.';

        if (interaction.member.id === process.env.DM_ID) {
            let player = game.players[interaction.options.get('user').value];
            let room = game.channels[interaction.options.get('destination').value];

            player = await game.moveEntity(player.entity, room.name);
            replyMessage = '✅ Téléportation réussie.';
        };

        interaction.reply({
            content: `${replyMessage}`,
            ephemeral: true
        });
    }
};