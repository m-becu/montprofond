const { SlashCommandBuilder } = require("@discordjs/builders");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear_dms')
        .setDescription('Supprime votre historique de conversation avec Gandalf.'),

    async execute(game, interaction) {
        // TODO: Clear all Gandalf's sent messages
        try {
            await interaction.member.createDM();
            let dm = await interaction.member.user.dmChannel;
            dm.messages.fetch()
                .then(async messages => {
                    let sentMessages = messages.filter(m => m.author.id === process.env.CLIENT_ID);
                    for (const [k, sent] of sentMessages) {
                        await sent.delete();
                    };
                    interaction.reply({ content: '🧹 Nettoyage terminé.', ephemeral: true });
                })
                .catch(console.error);
        } catch (e) {
            console.error(e);
        }
    }
};