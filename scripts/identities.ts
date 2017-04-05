import * as Q from "q";
import { WebApiTeam } from "TFS/Core/Contracts";
import { getClient } from "TFS/Core/RestClient";
import { JsonPatchOperation, Operation, IdentityRef } from "VSS/WebApi/Contracts";

function getTeamIdentities(project: { id: string, name: string }, team: WebApiTeam): IPromise<IdentityRef[]> {
    return getClient().getTeamMembers(project.id, team.id).then(members => {
        return members.filter(m => !m.isContainer);
    });
}

function getAllIdentitiesInAllProjectsImpl(project: { id: string, name: string }): IPromise<IdentityRef[]> {
    return getAllIdentitiesInProjectImpl(project, 0);
}

function mergeIdentityArrs(identitiesArr: IdentityRef[][]) {
    const projectIdentities: { [uniqueName: string]: IdentityRef } = {};
    for (let teamIdentities of identitiesArr) {
        for (let identity of teamIdentities) {
            projectIdentities[identity.uniqueName] = identity;
        }
    }
    return Object.keys(projectIdentities).sort().map(key => projectIdentities[key]);

}
function getAllIdentitiesInProjectImpl(project: { id: string, name: string }, skip: number): IPromise<IdentityRef[]> {
    return getClient().getTeams(project.id, 100, skip).then(teams => {
        const promises = teams.map(t => getTeamIdentities(project, t));
        if (teams.length === 100) {
            promises.push(getAllIdentitiesInProjectImpl(project, skip + 100));
        }
        return Q.all(promises).then(identitiesArr =>
            mergeIdentityArrs(identitiesArr)
        );
    });
}
export function getAllIdentitiesInAllProjects(): IPromise<IdentityRef[]> {
    return getClient().getProjects().then(projects =>
        Q.all(projects.map(p => getAllIdentitiesInAllProjectsImpl(p))).then(
            allProjectIdentities =>
                mergeIdentityArrs(allProjectIdentities)
        )
    );
}


/** No way to know if identity field from extension api, just hardcode the system ones */
const knownIdentities: string[] = [
    "System.AuthorizedAs",
    "System.ChangedBy",
    "System.AssignedTo",
    "System.CreatedBy",
    "Microsoft.VSTS.Common.ActivatedBy",
    "Microsoft.VSTS.Common.ResolvedBy",
    "Microsoft.VSTS.Common.ClosedBy",
    "Microsoft.VSTS.CodeReview.AcceptedBy",
    "Microsoft.VSTS.Common.ReviewedBy",
    "Microsoft.VSTS.CMMI.SubjectMatterExpert1",
    "Microsoft.VSTS.CMMI.SubjectMatterExpert2",
    "Microsoft.VSTS.CMMI.SubjectMatterExpert3",
    "Microsoft.VSTS.CMMI.CalledBy",
    "Microsoft.VSTS.CMMI.RequiredAttendee1",
    "Microsoft.VSTS.CMMI.RequiredAttendee2",
    "Microsoft.VSTS.CMMI.RequiredAttendee3",
    "Microsoft.VSTS.CMMI.RequiredAttendee4",
    "Microsoft.VSTS.CMMI.RequiredAttendee5",
    "Microsoft.VSTS.CMMI.RequiredAttendee6",
    "Microsoft.VSTS.CMMI.RequiredAttendee7",
    "Microsoft.VSTS.CMMI.RequiredAttendee8",
    "Microsoft.VSTS.CMMI.OptionalAttendee1",
    "Microsoft.VSTS.CMMI.OptionalAttendee2",
    "Microsoft.VSTS.CMMI.OptionalAttendee3",
    "Microsoft.VSTS.CMMI.OptionalAttendee4",
    "Microsoft.VSTS.CMMI.OptionalAttendee5",
    "Microsoft.VSTS.CMMI.OptionalAttendee6",
    "Microsoft.VSTS.CMMI.OptionalAttendee7",
    "Microsoft.VSTS.CMMI.OptionalAttendee8",
    "Microsoft.VSTS.CMMI.ActualAttendee1",
    "Microsoft.VSTS.CMMI.ActualAttendee2",
    "Microsoft.VSTS.CMMI.ActualAttendee3",
    "Microsoft.VSTS.CMMI.ActualAttendee4",
    "Microsoft.VSTS.CMMI.ActualAttendee5",
    "Microsoft.VSTS.CMMI.ActualAttendee6",
    "Microsoft.VSTS.CMMI.ActualAttendee7",
    "Microsoft.VSTS.CMMI.ActualAttendee8",
];
export function isIdentityField(refName: string): boolean {
    return knownIdentities.indexOf(refName) >= 0;
}

