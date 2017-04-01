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
        const projectIdentities: {[uniqueName: string]: IdentityRef} = {};
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
