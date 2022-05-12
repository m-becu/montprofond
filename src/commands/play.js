const { SlashCommandBuilder } = require("@discordjs/builders");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Débute votre aventure dans Montprofond')
        .addStringOption(option => option.setName('name')
            .setDescription('Nom de votre personnage')
            .setRequired(true)),

    async execute(game, interaction) {
        let player;

        player = await game.newPlayer(interaction.options.get('name').value, interaction.member);
        player.entity = await game.moveEntity(player.entity, 'le-portail-béant');

        await player.member.roles.add('973006750393454602');

        interaction.reply({
            content: '✅ Enregistrement du personnage réussi!',
            ephemeral: true
        });
    }
};
