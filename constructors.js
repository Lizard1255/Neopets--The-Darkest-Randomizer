export function ItemCheck(type,map,address,value){
    this.type = type;
    this.map = map;
    this.address = address;
    this.value = value;
    this.textLine = function(){
        return "patch=1,EE," + this.address.toString(16) + ",byte," + this.value.toString(16).toUpperCase()
    };
}

export const motes = {
    fire:       0xa0,
    lava:       0xa1,
    bubble:     0xa2,
    water:      0xa3,
    leaf:       0xa4,
    rock:       0xa5,
    fog:        0xa6,
    wind:       0xa7,
    smoke:      0xa8,
    shadow:     0xa9,
    light:      0xaa,
    sun:        0xab,
    nova:       0xac,
    supernova:  0xad
}

export const upgrades = {
    redNegg:    0xae,
    starryNegg: 0x9a,
    goldenNegg: 0x97,
    clover4:    0x13,
    clover12:   0x14
}

export const consumables = {
    redJuppie: 0x95,
    purpleJuppie: 0x96,
    chokato: 0x92,
    starberry: 0x9c,
    peachpa: 0x9d,
    ergyfruit: 0x93,
    Kauvara: 0x3a,
    Fyora: 0x3b,
    bagguss: 0x91
}