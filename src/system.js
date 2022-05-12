const { Room } = require("./classes/room");
const { Item } = require("./classes/item");
const { Player } = require("./classes/player");

const { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');

const trinketsData = require('../src/data/trinkets.json');
const randInt = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1) + min);
};

var ECS = {};

// G A M E
ECS.Game = function game() {

    this.players = {};
    this.channels = {};
    this.entities = {};
    this.items = {};
    this.rooms = {};
    this.areas = {};

    var gameData = require('./data/game.json');
    for (const areaData of gameData.areas) {
        this.areas[areaData.name] = areaData;
    };
    for (const roomData of gameData.rooms) {
        this.newRoom(roomData);
    };

    return this;
};

ECS.Game.prototype.newPlayer = function newPlayer(name, memberData) {
    let entity = new ECS.Entity();
    
    entity.addComponent(new ECS.Components.Name(name));
    entity.addComponent(new ECS.Components.Member(memberData));
    entity.addComponent(new ECS.Components.Location(this.rooms['limbes']));

    let player = new Player(entity);

    this.entities[entity.id] = player;
    this.players[memberData.id] = player;

    return player;
};

ECS.Game.prototype.newNPC = function newNPC(npcData) {
    let entity = new ECS.Entity();

    if (npcData.name) {
        entity.addComponent(new ECS.Components.Name(npcData.name));
    }
    
    if (npcData.location) {
        entity.addComponent(new ECS.Components.Location(npcData.location));
    }

    this.entities[entity.id] = entity;
    return entity;
};

ECS.Game.prototype.newRoom = function newRoom(roomData) {
    let room = new Room(roomData, this);
    this.rooms[room.name] = room;
    return room;
};

ECS.Game.prototype.newItem = function newItem(itemData) {
    let entity = new ECS.Entity();

    entity.addComponent(new ECS.Components.Name(itemData.name));
    entity.addComponent(new ECS.Components.Desc(itemData.desc));

    let item = new Item(entity);

    this.entities[entity.id] = item;
    this.items[itemData.id] = item;

    return item;
};

ECS.Game.prototype.moveEntity = async function moveEntity(entity, location) {
    try {
        if (!this.rooms[location]) {
            console.log("This room doesn't exist.");
            return entity
        };
        if (!entity.hasComponent('location')) {
            console.log("This entity doesn't have a location component.");
            return entity
        };

        let entityMovement = new ECS.Systems.Movement(entity);
        entity = await entityMovement.move(this.rooms[location]);
        
        if (!entity.hasComponent('member')) return entity;
        
        let entityNarration = new ECS.Systems.Narration(entity);
        let roomDescription = entityNarration.describeRoom(this.rooms[location]);
        
        await entityNarration.whisperMessage(roomDescription);

        return entity;
    } catch (e) {
        console.error(e);
    }
};

ECS.Game.prototype.resolvePlayerAction = async function resolvePlayerAction(entity, room, actionID, interaction) {
    let reply = { embeds: [], components: [] }
    try {
        let actionData = room.actions[actionID];
        let actionResult = await room.gameActions[actionData.id].run();

        let narrationContext = new ECS.Systems.Narration(entity);
        let embedMessage = await narrationContext.describeAction(actionData, actionResult);

        // console.log(embedMessage);
        reply.embeds.push(embedMessage);

        await interaction.reply(reply);
        
    } catch (e) {
        console.error(e);
        await interaction.reply({
            content: "Une erreur est survenue, contactez le Maître du Donjon.",
            ephemeral: true
        });
    };

};

ECS.Game.prototype.getRoomAction = function getRoomAction(_data) {
    let action = ()=>{};
    let data = _data.split('|');

    switch (data[0]) {
        case 'give':
            switch (data[1]) {
                case 'item':
                    switch (data[2]) {
                        case 'trinket':
                            let contextTable = new ECS.Systems.Tables();
                            action = (() => {
                                let newItem = this.newItem(contextTable.getTrinket());
                                // Add item to player inventory
                                return newItem.name;
                            });
                            break;
                    
                        default:
                            break;
                    }
                    break;
            
                default:
                    break;
            }
            break;
            
        case 'read':
            switch (data[1]) {
                case 'elven':
                    action = () => {
                        // Vérifier si le joueur peut lire le message
                        return data[2];
                    };
                    break;

                case 'common':
                default:
                    break;
            }
            break;
        
        default:
            break;
    };

    return action;
};

// E N T I T I E S
ECS.Entity = function Entity() {
    this.id = (+new Date()).toString(16) +
        (Math.random() * 1000 * 10000 | 0).toString(16) +
        ECS.Entity.prototype._count;

    ECS.Entity.prototype._count++;
    
    this.components = {};
    
    return this;
};

ECS.Entity.prototype._count = 0;

ECS.Entity.prototype.addComponent = function addComponent(component) {
    this.components[component.name] = component;
    return this;
};

ECS.Entity.prototype.removeComponent = function removeComponent(componentName) {
    var name = componentName;
    if (typeof componentName === 'function') {
        name = componentName.prototype.name;
    }

    delete this.components[name];
    return this;
};

ECS.Entity.prototype.hasComponent = function hasComponent(componentName) {
    let res = false;
    let name = componentName;

    if (typeof componentName === 'function') {
        name = componentName.prototype.name;
    }

    if (this.components[name]) res = true;

    return res;
};

// C O M P O N E N T S
ECS.Components = {};

ECS.Components.Name = function name(value) {
    this.value = value || 'Inconnu';
    return this;
};
ECS.Components.Name.prototype.name = 'name';

ECS.Components.Desc = function desc(value) {
    this.value = value || "";
    return this;
};
ECS.Components.Desc.prototype.name = 'desc';

ECS.Components.Member = function member(value) {
    if (!value) return;
    this.value = value;
    return this;
};
ECS.Components.Member.prototype.name = 'member';

ECS.Components.Location = function location(room) {
    this.room = room || new Room({ id: -1, name: 'limbes' });
    return this;
};
ECS.Components.Location.prototype.name = 'location';

// S Y S T E M S
ECS.Systems = {};

ECS.Systems.Movement = function Movement(entity) {
    this.entity = entity;
    return this;
};

ECS.Systems.Movement.prototype.move = async function move(destination) {
    if (this.entity.hasComponent('location')) {
        await this.entity.components.location.room.leave(this.entity);
        this.entity.components.location.room = await destination.enter(this.entity);
    };
    return this.entity;
};

ECS.Systems.Narration = function Narration(entity) {
    this.entity = entity;
};

ECS.Systems.Narration.prototype.whisperMessage = async function whisperMessage(message) {
    // Verify that entity is player
    try {
        let user = this.entity.components.member.value.user;

        await user.createDM();
        let dm = await user.dmChannel;
        dm.messages.fetch()
            .then(async messages => {
                let sentMessages = messages.filter(m => m.author.id === process.env.CLIENT_ID);
                for (const [k, sent] of sentMessages) {
                    await sent.delete();
                };
                await dm.send(message);
            }).catch(console.error);

    } catch (e) {
        console.error(e);
    }
};

ECS.Systems.Narration.prototype.whisperReply = async function whisperReply(message) {
    try {
        let user = this.entity.components.member.value.user;

        await user.createDM();
        let dm = await user.dmChannel;
        
        await dm.send({
            content: message || "Erreur description.",
            ephemeral: true
        });

    } catch (e) {
        console.error(e);
    }
};

ECS.Systems.Narration.prototype.describeAction = async function describeAction(action, message) {
    try {
        const embed = new MessageEmbed()
            .setTitle(action.name)
            .setDescription(action.desc + '**' + message + '**.')
            .setColor('#302D8C');
        
        return embed;

    } catch (e) {
        console.error(e);
    }
};

ECS.Systems.Narration.prototype.describeRoom = function describeRoom(room) {
    
    var messageToSend = { embeds: [], components: [] };

    try {

        const { occupants, exits } = room.describeTo(this.entity);
        const embed = new MessageEmbed()
            .setTitle(room.displayName)
            .setDescription(room.desc)
            .setColor('#1F8B4C')
            .addField("Occupants", occupants)
            .addField("Sorties", exits);

        if (embed) messageToSend.embeds.push(embed);

        if (room.actions) {
            // Room specific actions
            let buttons = [];
            room.actions.forEach(a => {
                const button = new MessageButton()
                    .setCustomId(`action|${room.name}|${a.id}`)
                    .setLabel(a.name)
                    .setStyle('SECONDARY')
                buttons.push(button);
            });

            messageToSend.components.push(new MessageActionRow().addComponents(buttons));
        };

        if (room.exits.length > 0) {
            // Room specific exits
            let buttons = [];
            room.exits.forEach(a => {
                if (a.hidden) return;
                const button = new MessageButton()
                    .setCustomId(`exit|${a.dest}`)
                    .setLabel(a.name)
                    .setStyle('PRIMARY')
                buttons.push(button);
            });

            messageToSend.components.push(new MessageActionRow().addComponents(buttons));
        };

        return messageToSend;

    } catch (e) { console.error(e) };
};

ECS.Systems.Tables = function Tables() {
    this.trinkets = {};

    for (const trinket of trinketsData) {
        this.trinkets[trinket.id] = trinket;
    };
};

ECS.Systems.Tables.prototype.getTrinket = function getTrinket(id) {
    let trinketID = id || randInt(0, trinketsData.length - 1);

    return this.trinkets[trinketID];
};

module.exports = { ECS };