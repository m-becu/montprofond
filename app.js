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
const { ECS } = require('./src/system');

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

// Game logic
var game = new ECS.Game();

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
        await command.execute(game, interaction);
    } catch (e) {
        console.error(e);
        await interaction.reply({
            content: "Une erreur est survenue, contactez le Maître du Donjon.",
            ephemeral: true
        });
    }
});

// Handle channels
var gameData = require('./src/data/game.json');
var undermountain;
var createdChannels = [];

// Login Gandalf to Discord
gandalf.login(process.env.TOKEN).then(async () => {
    undermountain = await gandalf.guilds.cache.get(process.env.GUILD_ID);

    gameData.areas.forEach(async (area) => {
        let category = await undermountain.channels.create(
            area.displayName,
            { type: 'GUILD_CATEGORY' }
        );
        createdChannels.push(category.id);

        const rooms = gameData.rooms.filter(r => r.area === area.name);
        rooms.forEach(async (room) => {
            let channel = await category.createChannel(room.name);
            room.id = channel.id;

            createdChannels.push(channel.id);
            
            game.rooms[room.name].channel = channel;
        });
    });

    console.log("🧙 Gandalf is ready!");
}).catch(console.error);

// Clean node process exit
process.on('SIGINT', async () => {
    for (const channelID of createdChannels) {
        const channel = await undermountain.channels.fetch(channelID);
        await channel.delete();
    }
    console.log("👋 Goodbye!");
    process.exit(1);
});