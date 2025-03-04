document.addEventListener('DOMContentLoaded', async function () {
    const LS = await browser.storage.local.get()
    if (LS['JSESSIONID']) {
        document.getElementById('session_id').value = LS['JSESSIONID']
    }
    document.getElementById('sessionPrompt').style.display = 'block'
    document.getElementById('session-form').addEventListener('submit', async function (e) {
        e.preventDefault()
        const JSESSIONID = document.getElementById('session_id').value
        await browser.storage.local.set({ JSESSIONID })
        getRelations()
    })
    async function getRelations() {
        relationsFetcher(LS['JSESSIONID'])
    }
    async function relationsFetcher(sessionID) {
        document.getElementById('status').innerText = 'Fetching relations...';
        document.getElementById('sessionPrompt').style.display = 'none';
        document.getElementById('progressContainer').style.display = 'block';
        let index = 0;
        let deleted = 0;
        let allRelationsFetched = false;
    
        while (!allRelationsFetched) {
            await new Promise(resolve => setTimeout(resolve, document.getElementById('delay').value));
    
            try {
                let response = await fetch(`https://www.linkedin.com/voyager/api/graphql?variables=(start:${index},origin:MEMBER_PROFILE_CANNED_SEARCH,query:(flagshipSearchIntent:SEARCH_SRP,queryParameters:List((key:network,value:List(F)),(key:resultType,value:List(PEOPLE))),includeFiltersInResponse:false))&queryId=voyagerSearchDashClusters.9c3177ca40ed191b452e1074f52445a8`, {
                    "credentials": "include",
                    "headers": {
                        "csrf-token": sessionID,
                        "Accept": "application/vnd.linkedin.normalized+json+2.1"
                    },
                    "method": "GET",
                    "mode": "cors",
                }, {cache: "no-store"});
    
                if (response.status === 403) {
                    document.getElementById('status').innerText = 'Session expired. Please enter a new session ID';
                    return;
                }
    
                if (response.status === 429) {
                    let backoffDelay = parseInt(document.getElementById('backoff_delay').value);
                    document.getElementById('status').innerText = `Too many requests. Waiting ${backoffDelay / 1000}s`;
                    await new Promise(resolve => setTimeout(resolve, backoffDelay));
                    continue;
                }
    
                if (response.status !== 200) {
                    allRelationsFetched = true;
                    break;
                }
    
                let data = await response.json();
                let parsed = data.included?.filter(element => element.template === "UNIVERSAL") || [];
    
                if (parsed.length === 0 || index + parsed.length >= document.getElementById('deletion_amount').value) {
                    allRelationsFetched = true;
                }
    
                document.getElementById('status').innerText = `Fetching relations: ${index + parsed.length} fetched`;
    
                for (let i = 0; i < parsed.length && deleted < document.getElementById('deletion_amount').value; i++) {
                    let element = parsed[i];                
                    console.log(element);
                    parsedVanityUser = element.navigationUrl.split('in/')[1].split('?')[0]
                    console.log(parsedVanityUser);
                    await new Promise(resolve => setTimeout(resolve, document.getElementById('delay').value));
                    let response2 = await deleteRelations(parsedVanityUser, sessionID);
                    if (response2.status === 403) {
                        document.getElementById('status').innerText = 'Session expired. Please enter a new session ID';
                        return;
                    }
        
                    if (response2.status === 429) {
                        let backoffDelay = parseInt(document.getElementById('backoff_delay').value);
                        document.getElementById('status').innerText = `Too many requests. Waiting ${backoffDelay / 1000}s`;
                        await new Promise(resolve => setTimeout(resolve, backoffDelay));
                        response2 = await deleteRelations(parsedVanityUser, sessionID);
                    }
                    if(response2.status === 200) {
                        deleted++;
                        document.getElementById('status').innerText = `Deleted relation with ${parsedVanityUser}`;
                        const percentage = ((deleted / document.getElementById('deletion_amount').value) * 100).toFixed(2);
                        if(document.querySelector('.total-progress').querySelector('.progress').style.width != `${percentage}%`){
                            document.querySelector('.total-progress').querySelector('.progress').style.width = `${percentage}%`;
                        }
                        document.querySelector('.total-count').innerText= `Deleted ${deleted}/${document.getElementById('deletion_amount').value} (${percentage}%)`;
                        document.title = `⏳ ${deleted}/${document.getElementById('deletion_amount').value} (${percentage}%)`;
                    } else {
                        document.getElementById('status').innerText = `Failed to delete relation with ${parsedVanityUser}`;
                    }
                    
                }
                if(deleted >= document.getElementById('deletion_amount').value) {
                    allRelationsFetched = true;
                    document.getElementById('status').innerText = `Done! Deleted ${deleted} relations`;
                    document.querySelector('.total-progress').querySelector('.progress').style.width = '100%';
                    document.querySelector('.total-count').innerText= `Deleted ${deleted} relations`;
                    document.title = `✅ Done!`;
                    return;
                }
                index += 10;
            } catch (error) {
                console.error('Error fetching relations:', error);
                allRelationsFetched = true;
            }
        }
    }
    
    async function deleteRelations(parsedVanityUser, sessionID) {
        let response = await fetch("https://www.linkedin.com/flagship-web/rsc-action/actions/server-request?sduiid=com.linkedin.sdui.mynetwork.RemoveConnectionId", {
            "credentials": "include",
            "headers": {
                "csrf-token": sessionID,
                "Content-Type": "application/json"
            },
            "body": `{\"requestId\":\"com.linkedin.sdui.mynetwork.RemoveConnectionId\",\"serverRequest\":{\"$type\":\"proto.sdui.actions.core.ServerRequest\",\"requestId\":\"com.linkedin.sdui.mynetwork.RemoveConnectionId\",\"payload\":{\"disconnectVanityName\":\"${parsedVanityUser}\"},\"requestedStates\":[],\"requestedArguments\":{\"$type\":\"proto.sdui.actions.requests.RequestedArguments\",\"payload\":{\"disconnectVanityName\":\"${parsedVanityUser}\"},\"requestedStateKeys\":[]},\"isStreaming\":false,\"rumPageKey\":\"\"},\"states\":[],\"requestedArguments\":{\"$type\":\"proto.sdui.actions.requests.RequestedArguments\",\"payload\":{\"disconnectVanityName\":\"${parsedVanityUser}\"},\"requestedStateKeys\":[],\"states\":[]}}`,
            "method": "POST",
            "mode": "cors"
        });
        if (response.status === 200) {
            console.log(`Deleted relation with ${parsedVanityUser}`);
        } else {
            console.error(`Failed to delete relation with ${parsedVanityUser}`);
        }
        return response;
    }
    document.getElementById('session_id').addEventListener('change', async function () {
        await browser.storage.local.set({ JSESSIONID: this.value })
    });
});
