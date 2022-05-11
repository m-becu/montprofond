const { Room } = require("./data/room");

const { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');

var ECS = {};

// G A M E
ECS.Game = function game() {

    this.players = {};
    this.channels = {};
    this.entities = {};
    this.rooms = {};
    this.areas = {};

    var gameData = require('./data/game.json');
    for (const areaData of gameData.areas) {
        this.areas[areaData.name] = areaData;
    };
    for (const roomData of gameData.rooms) {
        this.rooms[roomData.name] = new Room(roomData);
    };

    return this;
};

ECS.Game.prototype.newPlayer = function newPlayer(name, memberData) {
    let playerEntity = new ECS.Entity();
    
    playerEntity.addComponent(new ECS.Components.Name(name));
    playerEntity.addComponent(new ECS.Components.Player(memberData));
    playerEntity.addComponent(new ECS.Components.Location(this.rooms['limbes']));

    this.entities[playerEntity.id] = playerEntity;
    this.players[memberData.id] = playerEntity;

    return playerEntity;
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
    let room = new Room(roomData);
    this.rooms[room.name] = room;
    return room;
};

ECS.Game.prototype.moveEntity = async function moveEntity(entity, location) {
    if (!this.rooms[location]) return entity;
    
    if (entity.hasComponent('player')) {
        let entityMovement = new ECS.Systems.Movement(entity);
        let entityNarration = new ECS.Systems.Narration(entity);
        
        let roomDescription = entityNarration.describeRoom(this.rooms[location]);

        try {
            entityMovement.moveEntity(this.rooms[location]);
            entityNarration.whisperMessage(roomDescription);

        } catch (e) { console.error(e); }
    };
    return entity;
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

ECS.Components.Player = function player(value) {
    if (!value) return;
    this.value = value;
    return this;
};
ECS.Components.Player.prototype.name = 'player';

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

ECS.Systems.Movement.prototype.moveEntity = async function moveEntity(destination) {
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
    if (!this.entity.hasComponent('player')) return;
    let user = this.entity.components.player.value.user;

    await user.createDM();
    let dm = await user.dmChannel;
    dm.messages.fetch()
        .then(async messages => {
            let sentMessages = messages.filter(m => m.author.id === process.env.CLIENT_ID);
            for (const [k, sent] of sentMessages) {
                await sent.delete();
            };
            await dm.send(message);
        })
        .catch(console.error);
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

module.exports = { ECS };