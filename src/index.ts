import * as core from "@actions/core";
import * as github from "@actions/github";
import * as fs from "fs";
import { widgets } from "./widget";
import { activity } from "./widgets/activity";
import { timestamp } from "./widgets/timestamp";
import { repos } from "./widgets/repos";
import { feed } from "./widgets/feed";

async function run() {
  const token = core.getInput("github_token");
  const template = core.getInput("template");
  const readme = core.getInput("readme");
  const username = core.getInput("username");
  const subscriptions = core.getInput("feed");
  const octokit = github.getOctokit(token);

  let source = fs.readFileSync(template, "utf-8");

  const activityWidgets = widgets("GITHUB_ACTIVITY", source);
  if (activityWidgets) {
    core.info(`Found ${activityWidgets.length} activity widget.`);
    core.info(`Collecting activity for user ${username}...`);
    const events = await octokit.activity.listPublicEventsForUser({
      username,
      per_page: 100
    });
    for (const widget of activityWidgets) {
      core.info(`Generating widget "${widget.matched}"`);
      source = source.replace(widget.matched, activity(events, widget));
    }
  }

  const reposWidgets = widgets("GITHUB_REPOS", source);
  if (reposWidgets) {
    core.info(`Found ${reposWidgets.length} repos widget.`);
    core.info(`Collecting repos for user ${username}...`);
    const repositories = await octokit.repos.listForUser({
      username,
      type: "all",
      per_page: 100
    });
    for (const widget of reposWidgets) {
      core.info(`Generating widget "${widget.matched}"`);
      source = source.replace(widget.matched, repos(repositories, widget));
    }
  }

  const timestampWidgets = widgets("TIMESTAMP", source);
  if (timestampWidgets) {
    core.info(`Found ${timestampWidgets.length} timestamp widget.`);
    for (const widget of timestampWidgets) {
      core.info(`Generating widget "${widget.matched}"`);
      source = source.replace(widget.matched, timestamp(widget));
    }
  }

  if (fs.existsSync(subscriptions)) {
    const subscribe = JSON.parse(fs.readFileSync(subscriptions, "utf-8"));
    const feedWidgets = widgets("FEED", source);
    if (feedWidgets) {
      core.info(`Found ${feedWidgets.length} feed widget.`);
      for (const widget of feedWidgets) {
        source = source.replace(widget.matched, await feed(subscribe, widget));
      }
    }
  }

  fs.writeFileSync(readme, source);
}

run().catch(error => {
  core.error(error);
  process.exit(1);
});
