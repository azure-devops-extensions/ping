import { IPingCallbacks, IPingContext, IPingArguments } from "./choosePingIdentity";
import * as Q from "q";
import { getClient } from "TFS/WorkItemTracking/RestClient";
import { WorkItem } from "TFS/WorkItemTracking/Contracts";
import { JsonPatchOperation, Operation, IdentityRef } from "VSS/WebApi/Contracts";
import { isIdentityField } from "./identities";
import { trackEvent, trackPageView } from "./events";
import { Timings } from "./timings";

function pingWorkItems(message: string, workItemIds: number[], refNameOrIdentity: string | IdentityRef, pingTImings: Timings) {
    const wiPromise = refNameOrIdentity instanceof String || typeof refNameOrIdentity === "string" ? getClient().getWorkItems(workItemIds, [refNameOrIdentity]) : Q([] as WorkItem[]);
    return wiPromise.then(wis => {
        pingTImings.measure("readWorkItems");
        if (refNameOrIdentity instanceof String || typeof refNameOrIdentity === "string") {
            const refName = refNameOrIdentity;
            return Q.all(wis.map(wi => {
                const idstring = wi.fields[refName];
                const match: string[] = idstring.match(/(.*) <(.*)>/) || ["", "", "No identity found"];
                const [, displayName, uniqueName] = match;

                const updateDoc: JsonPatchOperation = {
                    op: Operation.Add,
                    value: `<a href="mailto:${uniqueName}" data-vss-mention="version:1.0">@${displayName}</a><div>${message}</div>`,
                    from: "",
                    path: "/fields/System.History"
                };
                getClient().updateWorkItem([updateDoc], wi.id);
            }));
        } else {
            const identity = refNameOrIdentity;
            const updateDoc: JsonPatchOperation = {
                op: Operation.Add,
                value: `<a href="mailto:${identity.uniqueName}" data-vss-mention="version:1.0">@${identity.displayName}</a><div>${message}</div>`,
                from: "",
                path: "/fields/System.History"
            };
            return Q.all(workItemIds.map(id => getClient().updateWorkItem([updateDoc], id)));
        }
    });
}

function createChooseIdentityDialog(actionContext: { selectedWorkItems: number[] }, refName?: string, fieldName?: string) {
    console.log("action context", actionContext);
    const { selectedWorkItems } = actionContext;
    VSS.getService(VSS.ServiceIds.Dialog).then(function (dialogService: IHostDialogService) {
        let getArguments = () => {
            console.log("Get identity not set");
            return Q({} as IPingArguments);
        };

        let externalDialog: IExternalDialog;
        function save() {
            return getArguments().then(({ identity, message }) => {
                const identityOrRefName = refName || identity;
                if (!identityOrRefName) {
                    throw new Error("Refname or identity must have value");
                }
                const pingTimings = new Timings();
                return pingWorkItems(message, selectedWorkItems, identityOrRefName, pingTimings).then(() => {
                    pingTimings.measure("updateWorkItems");
                    pingTimings.measure("total", true);
                    const identityFrom = (identityOrRefName instanceof String || typeof identityOrRefName === "string") ? identityOrRefName : "value";
                    trackEvent("ping", {
                        identityFrom: identityFrom,
                        wiCount: String(selectedWorkItems.length),
                        messageLength: String(message.length)
                    }, pingTimings.measurements);
                    new Audio("/ping.mp3").play();
                    externalDialog.close();
                });
            });
        }
        const extInfo = VSS.getExtensionContext();
        const contentContribution = `${extInfo.publisherId}.${extInfo.extensionId}.choose-identity`;
        const dialogOptions: IHostDialogOptions = {
            title: fieldName ? `Ping ${fieldName}` : "Ping...",
            width: 400,
            height: 200,
            okText: "Ping",
            getDialogResult: save,
        };
        const pingContext: IPingContext = {
            fieldName: fieldName,
            updateOkButton: (enabled) => externalDialog.updateOkButton(enabled)
        };
        dialogService.openDialog(contentContribution, dialogOptions, pingContext).then(dialog => {
            externalDialog = dialog;
            dialog.getContributionInstance("choose-identity").then((callbacks: IPingCallbacks) => {
                getArguments = callbacks.getArguments as any;
            });
        });
    });
}

function createMenuItems(workItemIds: number[]): IPromise<IContributedMenuItem[]> {
    return getClient().getWorkItems(workItemIds).then((workitems: WorkItem[]) => {
        const filledIdFields: { [refName: string]: boolean } = {};
        if (workitems.length > 0) {
            for (let id in workitems[0].fields) {
                if (isIdentityField(id)) {
                    filledIdFields[id] = true;
                }
            }
            for (let { fields } of workitems.slice(1)) {
                for (let id in filledIdFields) {
                    filledIdFields[id] = filledIdFields[id] && Object.keys(fields).some(f => f === id);
                }
            }
        }
        const idFields = Object.keys(filledIdFields).filter(f => filledIdFields[f]);

        // Now get each wit for the selected work items.
        return getClient().getFields().then(fields => {
            const nameLookup: { [referenceName: string]: string } = {};
            for (let field of fields) {
                nameLookup[field.referenceName] = field.name;
            }
            const menuItems: IContributedMenuItem[] = [{
                text: "Choose Identity...",
                action: context => createChooseIdentityDialog(context)
            }, ...idFields.map(id => {
                return {
                    text: nameLookup[id],
                    action: context => createChooseIdentityDialog(context, id, nameLookup[id]),
                } as IContributedMenuItem;
            })];
            trackPageView("pingContext", { wiCount: String(workItemIds.length), fieldCount: String(idFields.length) });
            return menuItems;
        });
    });
}

const actionProvider: IContributedMenuSource = {
    getMenuItems: (context: { workItemIds: number[] }) => {
        const { workItemIds } = context;
        new Audio("/ping.mp3").play();
        console.log("context", context);
        const items: IContributedMenuItem[] = [{
            text: "Ping!",
            icon: "/img/logo.svg",
            childItems: createMenuItems(workItemIds),
        }];
        return items;
    }
};

// Register context menu action provider
VSS.register(VSS.getContribution().id, actionProvider);