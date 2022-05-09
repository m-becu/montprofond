/**
 * @author Anorak
 * @copyright palimagus 2022
 * @version 0.1.0
 * 
 * Made with 🍵 by Anorak
 * Developpement started 05-08-2022
 * https://discord.gg/aHmNxt33ZM
 */

// Import config
require('dotenv').config();

// Dependencies
const fs = require('node:fs');

// Command dependencies
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const rest = new REST({ version: '9' }).setToken(process.env.TOKEN);

// Creating Discord bot
const { Client, Intents, Collection } = require('discord.js');
const gandalf = new Client({
    retryLimit: Infinity,
    partials: ['USER', 'CHANNEL', 'GUILD_MEMBER', 'MESSAGE', 'REACTION'],
    intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES]
});

// Handle commands
gandalf.commands = new Collection();
const commands = [];
const commandFiles = fs.readdirSync('./src/commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
    const command = require(`./src/commands/${file}`);
    // Set a new item in the collection
    commands.push(command.data.toJSON());
    gandalf.commands.set(command.data.name, command);
}
(async () => {
    await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
        { body: commands }
    ).then(() => console.log("✅ Successfully loaded application commands.")
    ).catch(console.error);
})();

// Handle events
gandalf.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;
    const command = gandalf.commands.get(interaction.commandName);

    if (!command) return;
    try {
        await command.execute(interaction);
    } catch (e) {
        console.error(e);
        await interaction.reply({
            content: "Une erreur est survenue, contactez le Maître du Donjon.",
            ephemeral: true
        });
    }
});

// Login Gandlaf to Discord
gandalf.login(process.env.TOKEN).then(() => {
    console.log("🧙 Gandalf is ready!");
}).catch(console.error);

// Clean node process exit
process.on('SIGINT', () => {
    console.log("👋 Goodbye!");
    process.exit(1);
});