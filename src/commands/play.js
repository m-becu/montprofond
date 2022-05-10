const { SlashCommandBuilder } = require("@discordjs/builders");
const { ECS } = require("../system");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Débute votre aventure dans Montprofond')
        .addStringOption(option => option.setName('name')
            .setDescription('Nom de votre personnage')
            .setRequired(true)),

    async execute(game, interaction) {
        let playerEntity = game.newPlayer(interaction.options.get('name').value, interaction.member);    
        await playerEntity.components.player.value.roles.add('973006750393454602');

        game.moveEntity(playerEntity, 'le-portail-béant');

        interaction.reply({
            content: '✅ Enregistrement du personnage réussi!',
            ephemeral: true
        });
    }
};