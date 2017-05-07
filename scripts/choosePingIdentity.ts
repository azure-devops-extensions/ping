import { Combo, IComboOptions } from "VSS/Controls/Combos";
import { Control } from "VSS/Controls";
import { JsonPatchOperation, Operation, IdentityRef } from "VSS/WebApi/Contracts";
import { getAllIdentitiesInAllProjects } from "./identities";
import { trackPageView, trackEvent } from "./events";

export interface IPingContext {
    fieldName?: string;
    updateOkButton: (boolean) => void;
}
export interface IPingArguments {
    identity?: IdentityRef;
    message: string;
}
export interface IPingCallbacks {
    getArguments: () => IPingArguments;
}

const { updateOkButton, fieldName } = VSS.getConfiguration() as IPingContext;

const argsContainer = $(".args-container");
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
let idCombo: Combo | undefined;
if (fieldName) {
    updateOkButton(true);
} else {
    const idCombo: Combo = Control.createIn(Combo, argsContainer, idOptions) as Combo;
    getAllIdentitiesInAllProjects().then(identities => {
        cachedIdentities.push(...identities);
        idCombo.setSource(identities.map(i => `${i.displayName} <${i.uniqueName}>`));
        idCombo.setInputText("");
    });
}
const messageInput: JQuery = $(`<textarea 
    class="message-input"
    placeholder="Enter message..."
    rows=3
/>`);
function messageValue() {
    const rawVal = messageInput.val() as string;
    return rawVal.replace(/\n/g, '<br>');
}
argsContainer.append(messageInput);

const cachedIdentities: IdentityRef[] = [];

const getArguments = () => {return {
    identity: idCombo && cachedIdentities[idCombo.getSelectedIndex()],
    message: messageValue()
}; };
const callbacks: IPingCallbacks = {
    getArguments
};

trackPageView("messageDialog", {field: fieldName || "value"});
VSS.register("choose-identity", callbacks);