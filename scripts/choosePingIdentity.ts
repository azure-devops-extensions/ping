import { Combo, IComboOptions } from "VSS/Controls/Combos";
import { Control } from "VSS/Controls";
import { JsonPatchOperation, Operation, IdentityRef } from "VSS/WebApi/Contracts";
import { getAllIdentitiesInAllProjects } from "./identities";

export interface IPingContext {
    updateOkButton: (boolean) => void;
}
export interface IPingCallbacks {
    getIdentity: () => IdentityRef;
}

const { updateOkButton } = VSS.getConfiguration() as IPingContext;


const options: IComboOptions = {
    change: function(this: Combo) {
        updateOkButton(this.getSelectedIndex() >= 0);
    },
    value: "Loading identities..."
};
const combo: Combo = Control.createIn(Combo, $(".identity-container"), options) as Combo;

const cachedIdentities: IdentityRef[] = [];
getAllIdentitiesInAllProjects().then(identities => {
    cachedIdentities.push(...identities);
    combo.setSource(identities.map(i => `${i.displayName} <${i.uniqueName}>`));
    combo.setInputText("");
});

const getIdentity = () => cachedIdentities[combo.getSelectedIndex()];
const callbacks: IPingCallbacks = {
    getIdentity
};

VSS.register("choose-identity", callbacks);