import { Combo, IComboOptions } from "VSS/Controls/Combos";
import { Control } from "VSS/Controls";
import { JsonPatchOperation, Operation, IdentityRef } from "VSS/WebApi/Contracts";
import { getAllIdentitiesInAllProjects } from "./identities";

export interface IPingContext {
    updateOkButton: (boolean) => void;
}
export interface IPingArguments {
    identity: IdentityRef;
    message: string;
}
export interface IPingCallbacks {
    getArguments: () => IPingArguments;
}

const { updateOkButton } = VSS.getConfiguration() as IPingContext;


const idOptions: IComboOptions = {
    change: function(this: Combo) {
        updateOkButton(this.getSelectedIndex() >= 0);
    },
    value: "Loading identities...",
    maxAutoExpandDropWidth: 338,
    dropOptions: {
        maxRowCount: 3,
    }
};
const idCombo: Combo = Control.createIn(Combo, $(".args-container"), idOptions) as Combo;
const messageOptions: IComboOptions = {
    placeholderText: "Enter message...",
    mode: "text"
};
const messageCombo: Combo = Control.createIn(Combo, $(".args-container"), messageOptions) as Combo;

const cachedIdentities: IdentityRef[] = [];
getAllIdentitiesInAllProjects().then(identities => {
    cachedIdentities.push(...identities);
    idCombo.setSource(identities.map(i => `${i.displayName} <${i.uniqueName}>`));
    idCombo.setInputText("");
});

const getArguments = () => {return {
    identity: cachedIdentities[idCombo.getSelectedIndex()],
    message: messageCombo.getValue() as string
}; };
const callbacks: IPingCallbacks = {
    getArguments
};

VSS.register("choose-identity", callbacks);