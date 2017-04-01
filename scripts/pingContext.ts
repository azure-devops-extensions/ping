import { IPingCallbacks, IPingContext } from "./choosePingIdentity";
import * as Q from "q";
import { getClient } from "TFS/WorkItemTracking/RestClient";
import { JsonPatchOperation, Operation, IdentityRef } from "VSS/WebApi/Contracts";

function pingWorkItems(identity: IdentityRef, workItemIds: number[]) {
    const updateDoc: JsonPatchOperation = {
        op: Operation.Add,
        value: `<a href="mailto:${identity.uniqueName}" data-vss-mention="version:1.0">@${identity.displayName}<a/>`,
        from: null,
        path: "/fields/System.History"
    };
    return Q.all(workItemIds.map(id => getClient().updateWorkItem([updateDoc], id)));
}

function createChooseIdentityDialog(actionContext: { workItemIds: number[] }) {
    console.log("action context", actionContext);
    const { workItemIds } = actionContext;
    VSS.getService(VSS.ServiceIds.Dialog).then(function (dialogService: IHostDialogService) {
        let getIdentity = () => {
            console.log("Get identity not set");
            return Q({} as IdentityRef);
        };

        let externalDialog: IExternalDialog;
        function save() {
            return getIdentity().then(identity => {
                return pingWorkItems(identity, workItemIds).then(() => {
                    externalDialog.close();
                });
            });
        }
        const extInfo = VSS.getExtensionContext();
        const contentContribution = `${extInfo.publisherId}.${extInfo.extensionId}.choose-identity`;
        const dialogOptions: IHostDialogOptions = {
            title: "Ping...",
            width: 400,
            height: 200,
            okText: "Ping",
            getDialogResult: save,
        };
        const pingContext: IPingContext = {
            updateOkButton: (enabled) => externalDialog.updateOkButton(enabled)
        }
        dialogService.openDialog(contentContribution, dialogOptions, pingContext).then(dialog => {
            externalDialog = dialog;
            dialog.getContributionInstance("choose-identity").then((callbacks: IPingCallbacks) => {
                dialog.updateOkButton(true);
                dialog.updateOkButton;
                getIdentity = callbacks.getIdentity as any;
            });
        });
    });
}

const actionProvider: IContributedMenuSource = {
    getMenuItems: (context) => {
        console.log("context", context);
        const items: IContributedMenuItem[] = [{
            title: "Ping",
            action: createChooseIdentityDialog,
            icon: "/img/logo.svg"
        }];
        return items;
    }
};

// Register context menu action provider
VSS.register(VSS.getContribution().id, actionProvider);