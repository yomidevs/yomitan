# Deployments

We deploy yomitan to the Firefox and Chrome webstore via two channels -- the dev build and the stable build. We do this via a series of GitHub Actions.

Only collaborators with deployment permissions are allowed to deploy.

## Deploying a dev build

1. Tag the commit with a version number. Like: `git tag 24.4.28.0 HEAD` (do this after pulling in the latest changes in master) or `git tag 24.4.28.0 abc123`

> [!WARNING]
> You can not use leading zeroes in the version tags (e.g. `24.04.28.0`). Firefox store does not allow them and the deploy will fail.

2. Push the tag to origin. `git push origin 24.4.28.0`
3. The [`Create prerelease on tag`](https://github.com/yomidevs/yomitan/actions/workflows/create-prerelease-on-tag.yml) GH workflow will run and will publish a new release in [Releases](https://github.com/yomidevs/yomitan/releases) as well as kick off a workflow each for publishing to Firefox and Chrome.
4. Find the corresponding `publish-chrome-development` GH action run and unblock the deployment.
5. Find the corresponding `publish-firefox-development` GH action run and unblock the deployment.
6. Wait anywhere between 5mins to a few hours for the build to show up on the [Chrome extension page](https://chromewebstore.google.com/detail/yomitan-development-build/glnaenfapkkecknnmginabpmgkenenml). Firefox does not have a yomitan dev listing and users would have to down the extension locally from "Assets" section of each release.

## Deploying a stable build

1. Go to ["Releases"](https://github.com/yomidevs/yomitan/releases) and pick a version you want to promote to stable.
2. On the top right corner click on "Edit" and on the bottom there are two options `Set as a pre-release` and `Set as the latest release`. Uncheck `Set as a pre-release` and check `Set as the latest release`.
3. This will trigger the [`release`](https://github.com/yomidevs/yomitan/actions/workflows/release.yml) workflow which will in turn trigger the `publish-chrome` and `publish-firefox` GH workflows.
4. Unblock `publish-chrome` and `publish-firefox` respectively and wait 5 mins to a few hours for the extensions to reflect on [Chrome](https://chromewebstore.google.com/detail/yomitan/likgccmbimhjbgkjambclfkhldnlhbnn) and [Firefox](https://addons.mozilla.org/en-US/firefox/addon/yomitan/)
