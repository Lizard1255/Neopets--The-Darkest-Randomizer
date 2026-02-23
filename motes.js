import { ItemCheck } from "./constructors.js";
import { motes } from "./constructors.js";

export var moteList = [];

export function generateMotes(){
    // Ellis Family Farm
    moteList.push(new ItemCheck("mote","Ellis Family Farm",0x017B9374,motes.rock));
    moteList.push(new ItemCheck("mote","Ellis Family Farm",0x017B93B4,motes.light));
    moteList.push(new ItemCheck("mote","Ellis Family Farm",0x017B94B4,motes.leaf));
}