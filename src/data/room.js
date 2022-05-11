const { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');

class Room {
    constructor(roomData) {
        const { id, name, displayName, area, desc, exits, actions } = roomData;
        this.id = id;
        this.name = name;
        this.displayName = displayName;
        this.area = area;
        this.desc = desc;
        this.actions = actions;
        this.exits = exits;
        this.channel = null;
        this.entities = {};
    };
    
    // TODO: Refactor
    async trigger(triggerName, entity) {
        switch (triggerName) {

            case 'OnEnter':
                this.entities[entity.id] = entity;

                if (entity.hasComponent('player') && this.channel) {

                    let guildMember = entity.components.player.value; 
                    let embedMessage;

                    try {

                        // Print occupants to player
                        let listOfOccupants = [];
                        Object.entries(this.entities).forEach(([k, e]) => {
                            if (e.hasComponent('name') && e !== entity) listOfOccupants.push(e);
                        });
                        let occupantsString = this.generateOccupantsString(listOfOccupants);

                        // Print exits to player
                        let listOfExits = [];
                        this.exits.forEach(e => {
                            if (e.hidden) return;
                            listOfExits.push(e);
                        });
                        let exitsString = this.generateExitsString(listOfExits);
                        
                        // Create embed message
                        embedMessage = new MessageEmbed().setTitle(this.displayName).setDescription(this.desc).setColor('#1F8B4C').addField("Occupants", occupantsString).addField("Sorties", exitsString);

                        var messageToSend = { embeds: [embedMessage], components: [] };

                        if (this.actions) messageToSend.components.push(this.generateActionButtons());
                        if (this.exits.length > 0) {
                            
                            messageToSend.components.push(this.generateExitsButtons());
                        };

                        await guildMember.user.createDM();
                        let dm = await guildMember.user.dmChannel;
                        dm.messages.fetch()
                            .then(async messages => {
                                let sentMessages = messages.filter(m => m.author.id === process.env.CLIENT_ID);
                                for (const [k, sent] of sentMessages) {
                                    await sent.delete();
                                };
                                await dm.send(messageToSend);
                            })
                            .catch(console.error);
                    } catch (e) {
                        console.error(e);
                    }

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
        else if (list.length === 2) occupantsString = `${list[0].components.name.value} et ${list[1].components.name.value}`;
        else if (list.length >= 3) {
            for (let i=0;i<list.length-1;i++) occupantsString += `${list[i].components.name.value}, `;
            occupantsString += `et ${list[list.length-1].components.name.value}`;
        }

        return occupantsString === "" ? "Il n'y a personne ici." : occupantsString.length <= 1000 ? `Il y a ${occupantsString} dans cette pièce.` : "Il y a de nombreuses personnes dans cette pièce!";
    };

    generateExitsString(list) {
        list.sort(function (a, b) {
            let nameA = a.name.toLowerCase();
            let nameB = b.name.toLowerCase();
            if (nameA < nameB) return -1;
            if (nameA > nameB) return 1;
            return 0;
        });
        let exitsString = "";
        if (list.length === 1) exitsString = list[0].desc;
        else if (list.length === 2) exitsString = `${list[0].desc} et ${list[1].desc}`;
        else if (list.length >= 3) {
            for (let i=0;i<list.length-1;i++) exitsString += `${list[i].desc}, `;
            exitsString += `et ${list[list.length-1].desc}`;
        }
        
        return exitsString === "" ? "Il ne semble n'y avoir aucune sortie à cette pièce." : list.length > 1 ? `Il y a différentes sorties dans cette pièce: ${exitsString}.` : `La seule sortie semble être ${exitsString}.`;
    };

    generateActionButtons() {
        // Room specific actions
        let buttons = [];
        this.actions.forEach(a => {
            const button = new MessageButton()
                .setCustomId(`action|${this.name}|${a.id}`)
                .setLabel(a.name)
                .setStyle('SECONDARY')
            buttons.push(button);
        });

        return new MessageActionRow().addComponents(buttons);
    };

    generateExitsButtons() {
        // Room specific exits
        let buttons = [];
        this.exits.forEach(a => {
            if (a.hidden) return;
            const button = new MessageButton()
                .setCustomId(`exit|${a.dest}`)
                .setLabel(a.name)
                .setStyle('PRIMARY')
            buttons.push(button);
        });

        return new MessageActionRow().addComponents(buttons);
    }

};

exports.Room = Room;