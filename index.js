require('dotenv').config();
const http = require('http');
const { driver } = require('@rocket.chat/sdk');

// customize the following with your server and BOT account information
const HOST = 'http://10.152.183.239:3000';
const BOTNAME = 'Gitlab.Integration';  // name  bot response to
const SSL = false;  // server uses https ?
const ROOMS = ['general', 'Gitlab_Interation'];


const config_USER = process.env.USERBOT;
const config_PASS = process.env.PASS;

http.createServer((request, response) => {
  const { headers, method, url } = request;
  const event = headers['x-gitlab-event'];

  let body = [];
  request.on('error', (err) => {
    console.error(err);
  }).on('data', (chunk) => {
    body.push(chunk);
  }).on('end', async () => {
    body = Buffer.concat(body).toString();
    // BEGINNING OF NEW STUFF

    response.on('error', (err) => {
      console.error(err);
    });

var script = new Script();

    switch (event) {
        case 'Push Hook':
            result = await script.pushEvent(JSON.parse(body));
            break;
        case 'Merge Request Hook':
            result = await script.mergeRequestEvent(JSON.parse(body));
            break;
        case 'Note Hook':
            result = await script.commentEvent(JSON.parse(body));
            break;
        case 'Confidential Issue Hook':
        case 'Issue Hook':
            result = await script.issueEvent(JSON.parse(body), event);
            break;
        case 'Tag Push Hook':
            result = await script.tagEvent(JSON.parse(body));
            break;
        case 'Pipeline Hook':
            result = await script.pipelineEvent(JSON.parse(body));
            break;
        case 'Build Hook': // GitLab < 9.3
            result = await script.buildEvent(JSON.parse(body));
            break;
        case 'Job Hook': // GitLab >= 9.3.0
            result = await script.buildEvent(JSON.parse(body));
            break;
        case 'Wiki Page Hook':
            result = await script.wikiEvent(JSON.parse(body));
            break;
        default:
            result = await script.unknownEvent(request, event);
            break;
    }

    console.log(result);

    var dmtext = '';
    //dmtext = result.content.attachments[0].text + "\n" + result.content.attachments[1].text;

    const arr = result.content.attachments;

    arr.forEach(element =>{
        dmtext = dmtext + element.text + "\n";
    });

    console.log(dmtext);

    var myuserid;
    // this simple bot does not handle errors, different message types, server resets 
    // and other production situations 
    const runbot = async () => {
        const conn = await driver.connect( { host: HOST, useSsl: SSL});
        myuserid = await driver.login({username: config_USER, password: config_PASS});

        const dm = await driver.sendDirectToUser(dmtext,'JDoe');

        response.statusCode = 200;
        response.setHeader('Content-Type', 'application/json');
        const responseBody = { dmtext, dm};
        response.write(JSON.stringify(responseBody));
        response.end();

    return result;
    }

    runbot();


  });
}).listen(3000);

/* eslint no-console:0, max-len:0 */
// see <https://gitlab.com/help/web_hooks/web_hooks> for full json posted by GitLab
const MENTION_ALL_ALLOWED = false; // <- check that bot permission allow has mention-all before passing this to true.
const NOTIF_COLOR = '#6498CC';
const IGNORE_CONFIDENTIAL = true;
const refParser = (ref) => ref.replace(/^refs\/(?:tags|heads)\/(.+)$/, '$1');
const displayName = (name) => (name && name.toLowerCase().replace(/\s+/g, '.'));
const atName = (user) => (user && user.name ? '@' + displayName(user.name) : '');
const makeAttachment = (author, text, color) => {
    return {
        author_name: author ? displayName(author.name) : '',
        author_icon: author ? author.avatar_url : '',
        text,
        color: color || NOTIF_COLOR
    };
};
const pushUniq = (array, val) => ~array.indexOf(val) || array.push(val); // eslint-disable-line


class Script { // eslint-disable-line
    createErrorChatMessage(error) {
        return {
            content: {
                username: 'Rocket.Cat ErrorHandler',
                text: 'Error occured while parsing an incoming webhook request. Details attached.',
                icon_url: '',
                attachments: [
                    {
                        text: `Error: '${error}', \n Message: '${error.message}', \n Stack: '${error.stack}'`,
                        color: NOTIF_COLOR
                    }
                ]
            }
        };
    }

    unknownEvent(data, event) {
        return {
            content: {
                username: data.user ? data.user.name : (data.user_name || 'Unknown user'),
                text: `Unknown event '${event}' occured. Data attached.`,
                icon_url: data.user ? data.user.avatar_url : (data.user_avatar || ''),
                attachments: [
                    {
                        text: `${JSON.stringify(data, null, 4)}`,
                        color: NOTIF_COLOR
                    }
                ]
            }
        };
    }
    issueEvent(data, event) {
        if (event === 'Confidential Issue Hook' && IGNORE_CONFIDENTIAL) {
            return false;
        }
        const project = data.project || data.repository;
        const state = data.object_attributes.state;
        const action = data.object_attributes.action;
        let user_action = state;
        let assigned = '';

        if (action === 'update') {
            user_action = 'updated';
        }

        if (data.assignee) {
            assigned = `*Assigned to*: @${data.assignee.username}\n`;
        }

        return {
            content: {
                username: 'gitlab/' + project.name,
                icon_url: project.avatar_url || data.user.avatar_url || '',
                text: (data.assignee && data.assignee.name !== data.user.name) ? atName(data.assignee) : '',
                attachments: [
                    makeAttachment(
                        data.user, `${user_action} an issue _${data.object_attributes.title}_ on ${project.name}.
*Description:* ${data.object_attributes.description}.
${assigned}
See: ${data.object_attributes.url}`
                    )
                ]
            }
        };
    }

    commentEvent(data) {
        const project = data.project || data.repository;
        const comment = data.object_attributes;
        const user = data.user;
        const at = [];
        let text;
        if (data.merge_request) {
            const mr = data.merge_request;
            const lastCommitAuthor = mr.last_commit && mr.last_commit.author;
            if (mr.assignee && mr.assignee.name !== user.name) {
                at.push(atName(mr.assignee));
            }
            if (lastCommitAuthor && lastCommitAuthor.name !== user.name) {
                pushUniq(at, atName(lastCommitAuthor));
            }
            text = `commented on MR [#${mr.id} ${mr.title}](${comment.url})`;
        } else if (data.commit) {
            const commit = data.commit;
            const message = commit.message.replace(/\n[^\s\S]+/, '...').replace(/\n$/, '');
            if (commit.author && commit.author.name !== user.name) {
                at.push(atName(commit.author));
            }
            text = `commented on commit [${commit.id} ${message}](${comment.url})`;
        } else if (data.issue) {
            const issue = data.issue;
            text = `commented on issue [#${issue.id} ${issue.title}](${comment.url})`;
        } else if (data.snippet) {
            const snippet = data.snippet;
            text = `commented on code snippet [#${snippet.id} ${snippet.title}](${comment.url})`;
        }
        return {
            content: {
                username: 'gitlab/' + project.name,
                icon_url: project.avatar_url || user.avatar_url || '',
                text: at.join(' '),
                attachments: [
                    makeAttachment(user, `${text}\n${comment.note}`)
                ]
            }
        };
    }

    mergeRequestEvent(data) {
        data = JSON.parse(data);
        const user = data.user;
        const mr = data.object_attributes;
        const assignee = mr.assignee;
        let at = [];

        if (mr.action === 'open' && assignee) {
            at = '\n' + atName(assignee);
        } else if (mr.action === 'merge') {
            const lastCommitAuthor = mr.last_commit && mr.last_commit.author;
            if (assignee && assignee.name !== user.name) {
                at.push(atName(assignee));
            }
            if (lastCommitAuthor && lastCommitAuthor.name !== user.name) {
                pushUniq(at, atName(lastCommitAuthor));
            }
        }
        return {
            content: {
                username: `gitlab/${mr.target.name}`,
                icon_url: mr.target.avatar_url || mr.source.avatar_url || user.avatar_url || '',
                text: at.join(' '),
                attachments: [
                    makeAttachment(user, `${mr.action} MR [#${mr.iid} ${mr.title}](${mr.url})\n${mr.source_branch} into ${mr.target_branch}`)
                ]
            }
        };
    }

    async pushEvent(data) {
        console.log("Inside the pushEvent function");
        const project = await data.project || data.repository;
        const web_url = await data.project.web_url || dataproject.homepage;
        const user =  {
            name: data.user_name,
            avatar_url: data.user_avatar
        };
        // branch removal
        if (data.checkout_sha === null && !data.commits.length) {
            return {
                content: {
                    username: `gitlab/${project.name}`,
                    icon_url: data.project.avatar_url || data.user_avatar || '',
                    attachments: [
                        makeAttachment(user, `removed branch ${refParser(data.ref)} from [${project.name}](${web_url})`)
                    ]
                }
            };
        }
        // new branch
        if (data.before == 0) { // eslint-disable-line
            return {
                content: {
                    username: `gitlab/${project.name}`,
                    icon_url: project.avatar_url || data.user_avatar || '',
                    attachments: [
                        makeAttachment(user, `pushed new branch [${refParser(data.ref)}](${web_url}/commits/${refParser(data.ref)}) to [${project.name}](${web_url}), which is ${data.total_commits_count} commits ahead of master`)
                    ]
                }
            };
        }
        return {
            content: {
                username: `gitlab/${project.name}`,
                icon_url: project.avatar_url || data.user_avatar || '',
                attachments: [
                    makeAttachment(user.name, `pushed ${data.total_commits_count} commits to branch [${refParser(data.ref)}](${web_url}/commits/${refParser(data.ref)}) in [${project.name}](${web_url})`),
                    {
                        text: data.commits.map((commit) => `  - ${new Date(commit.timestamp).toUTCString()} [${commit.id}](${commit.url}) by ${commit.author.name}: ${commit.message.replace(/\s*$/, '')}`).join('\n'),
                        color: NOTIF_COLOR
                    }
                ]
            }
        };
    }

    tagEvent(data) {
        const project = data.project || data.repository;
        const web_url = project.web_url || project.homepage;
        const tag = refParser(data.ref);
        const user = {
            name: data.user_name,
            avatar_url: data.user_avatar
        };
        let message;
        if (data.checkout_sha === null) {
            message = `deleted tag [${tag}](${web_url}/tags/)`;
        } else {
            message = `pushed tag [${tag} ${data.checkout_sha}](${web_url}/tags/${tag})`;
        }
        return {
            content: {
                username: `gitlab/${project.name}`,
                icon_url: project.avatar_url || data.user_avatar || '',
                text: MENTION_ALL_ALLOWED ? '@all' : '',
                attachments: [
                    makeAttachment(user, message)
                ]
            }
        };
    }

    createColor(status) {
        switch (status) {
            case 'success':
                return '#2faa60';
            case 'pending':
                return '#e75e40';
            case 'failed':
                return '#d22852';
            case 'canceled':
                return '#5c5c5c';
            case 'created':
                return '#ffc107';
            case 'running':
                return '#607d8b';
            default:
                return null;
        }
    }

    pipelineEvent(data) {
        const project = data.project || data.repository;
        const commit = data.commit;
        const user = {
            name: data.user_name,
            avatar_url: data.user_avatar
        };
        const pipeline = data.object_attributes;

        return {
            content: {
                username: `gitlab/${project.name}`,
                icon_url: project.avatar_url || data.user_avatar || '',
                attachments: [
                    makeAttachment(user, `pipeline returned *${pipeline.status}* for commit [${commit.id}](${commit.url}) made by *${commit.author.name}*`, this.createColor(pipeline.status))
                ]
            }
        };
    }

    buildEvent(data) {
        const user = {
            name: data.user_name,
            avatar_url: data.user_avatar
        };

        return {
            content: {
                username: `gitlab/${data.repository.name}`,
                icon_url: '',
                attachments: [
                    makeAttachment(user, `build named *${data.build_name}* returned *${data.build_status}* for [${data.project_name}](${data.repository.homepage})`, this.createColor(data.build_status))
                ]
            }
        };
    }

    wikiPageTitle(wiki_page) {
        if (wiki_page.action === 'delete') {
            return wiki_page.title;
        }

        return `[${wiki_page.title}](${wiki_page.url})`;
    }

    wikiEvent(data) {
        const user_name = data.user.name;
        const project = data.project;
        const project_path = project.path_with_namespace;
        const wiki_page = data.object_attributes;
        const wiki_page_title = this.wikiPageTitle(wiki_page);
        const action = wiki_page.action;

        let user_action = 'modified';

        if (action === 'create') {
            user_action = 'created';
        } else if (action === 'update') {
            user_action = 'edited';
        } else if (action === 'delete') {
            user_action = 'deleted';
        }

        return {
            content: {
                username: project_path,
                icon_url: project.avatar_url || data.user.avatar_url || '',
                text: `The wiki page ${wiki_page_title} was ${user_action} by ${user_name}`
            }
        };
    }
}