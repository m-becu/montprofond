const { MessageEmbed } = require('discord.js');

class Room {
    constructor(roomData) {
        const { id, name, displayName, area, desc, exits } = roomData;
        this.id = id;
        this.name = name;
        this.displayName = displayName;
        this.area = area;
        this.desc = desc;
        this.exits = exits;
        this.channel = null;
        this.entities = {};
    };
    async trigger(triggerName, entity) {
        switch (triggerName) {
            case 'OnEnter':
                this.entities[entity.id] = entity;
                
                let embedMessage;
                try {
                    let listOfOccupants = [];
                    Object.entries(this.entities).forEach(([k, e]) => {
                        if (e.hasComponent('name') && e !== entity) listOfOccupants.push(e);
                    });
                    let occupantsString = this.generateOccupantsString(listOfOccupants);
                    embedMessage = new MessageEmbed().setTitle(this.displayName).setDescription(this.desc).setColor('#1F8B4C').addField("Occupants", occupantsString);

                } catch (e) { console.error(e); }

                if (entity.hasComponent('player') && this.channel) {

                    // TODO: Send message to user

                    this.channel.permissionOverwrites.create(entity.components.player.value, { 
                        VIEW_CHANNEL: true 
                    });
                };

                if (entity.hasComponent('name') && this.channel) {
                    await this.channel.send(`➡ ${entity.components.name.value} est entré.`);
                };

                break;
        
            case 'OnLeave':
                delete this.entities[entity.id];
                if (entity.hasComponent('player') && this.channel) {
                    this.channel.permissionOverwrites.create(entity.components.player.value, { 
                        VIEW_CHANNEL: null 
                    });
                };
                if (entity.hasComponent('name') && this.channel) {
                    await this.channel.send(`➡ ${entity.components.name.value} est parti.`);
                };
                break;

            default:
                break;
        };
    };
    generateOccupantsString(list) {
        list.sort(function (a, b) {
            let nameA = a.components.name.value.toLowerCase();
            let nameB = b.components.name.value.toLowerCase();
            if (nameA < nameB) return -1;
            if (nameA > nameB) return 1;
            return 0;
        });
        let occupantsString = "";
        if (list.length === 1) occupantsString = list[0].components.name.value;
        else if (list.length === 2) occupantsString = `${list[0].components.name.value} and ${list[1].components.name.value}`;
        else if (list.length >= 3) {
            for (let i=0;i<list.length-1;i++) occupantsString += `${list[i].components.name.value}, `;
            occupantsString += `and ${list[list.length-1].components.name.value}`;
        }

        return occupantsString === "" ? "Il n'y a personne ici." : occupantsString.length <= 100 ? `Il y a ${occupantsString} dans cette pièce.` : "Il y a de nombreuses personnes dans cette pièce!";;
    };
};

exports.Room = Room;