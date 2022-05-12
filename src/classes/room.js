class Room {

    constructor(roomData, game) {
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
        this.gameActions = this.makeGameActions(game, actions);
    };

    async enter(entity) {
        this.entities[entity.id] = entity;
        if (entity.hasComponent('name') && this.channel) {
            await this.channel.send(`➡ ${entity.components.name.value} est entré.`);
        };
        if (entity.hasComponent('player') && this.channel) {
            this.channel.permissionOverwrites.create(entity.components.player.value, { 
                VIEW_CHANNEL: true 
            });
        };
        this.trigger('OnEnter');
        return this;
    };

    async leave(entity) {
        delete this.entities[entity.id];
        if (entity.hasComponent('name') && this.channel) {
            await this.channel.send(`➡ ${entity.components.name.value} est parti.`);
        };
        if (entity.hasComponent('player') && this.channel) {
            this.channel.permissionOverwrites.create(entity.components.player.value, { 
                VIEW_CHANNEL: null 
            });
        };
        this.trigger('OnLeave');
        return this;
    };

    describeTo(entity) {

        // Print occupants
        let listOfOccupants = [];
        Object.entries(this.entities).forEach(([k, e]) => {
            if (e.hasComponent('name') && e !== entity) listOfOccupants.push(e);
        });

        // Print exits
        let listOfExits = [];
        this.exits.forEach(e => {
            if (e.hidden) return;
            listOfExits.push(e);
        });

        // Generate description object
        return {
            occupants: this.generateOccupantsString(listOfOccupants),
            exits: this.generateExitsString(listOfExits),
        };

    };

    makeGameActions(game, actions) {
        if (!actions) return {};
        
        let roomActions = {};
        actions.forEach(a => {
            let runCommand = ()=>{};
            
            if (a.run && game) {
                runCommand = game.getRoomAction(a.run);
            };

            roomActions[a.id] = {
                id: a.id,
                name: a.name,
                run: runCommand
            }
        });

        return roomActions;
    };
    
    trigger(triggerName) {};

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

};

exports.Room = Room;