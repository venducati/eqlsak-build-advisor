# Microsoft Store release guide

This guide prepares EQLSaK Character Build Advisor for a Microsoft Store release. A Store release gives Windows users a Microsoft-signed package. It removes the usual SmartScreen download warning for Store installs.

## What the Store does

EQLSaK currently has a normal Windows setup file (`.exe`). It is useful for direct downloads, but it is unsigned. A Microsoft Store release uses a separate `.appx` package.

Microsoft signs the Store package after it passes certification. You do not need to buy a code-signing certificate for this Store package.

Do not upload the normal `Setup.exe` as the Store package. The Store does not re-sign EXE installers.

## Step 1: open the publisher account

Go to [Microsoft Store developer registration](https://storedeveloper.microsoft.com/) and choose one account type:

- **Individual**: use this if you are publishing the free project as a personal creator.
- **Company**: use this if you publish under a registered business name.

The current Microsoft registration flow is free. It asks for identity verification. Microsoft will show the publisher name it verifies to people who install the app.

Keep your sign-in, ID, recovery codes, and verification documents private. Do not add them to this project or send them in chat.

## Step 2: reserve the app name

The Store name is reserved as **EQLSaK Character Build Advisor**. Its current Partner Center identity is `Venducati.EQLSaKCharacterBuildAdvisor` and its publisher is `Venducati`.

After reserving the name, Partner Center shows the package identity details. Record these two values:

1. **Package/Identity name**
2. **Publisher name**

The identity name is unique to the Store listing. It may differ from the name shown to players.

## Step 3: set the reserved identity in this project

`desktop/package.json` now contains the exact identity and publisher from Partner Center. Keep these values in sync if the product is moved to another publisher account.

Do not use a made-up identity or publisher value. Do not add a private certificate file to Git.

## Step 4: build the Store package

From the project root, build the app files first:

```text
npm run build
```

Then, from the `desktop` folder, create the Store package:

```text
npm run package:store
```

The output file is placed in `desktop/release` and ends in `-Store.appx`.

The build finds the installed Windows SDK automatically, then creates the required Store tile images from the project’s original compass artwork. No game logo, character art, or third-party artwork is included.

## Step 5: create the Store listing

In Partner Center, start a submission and complete its required sections:

1. Upload the generated `.appx` package.
2. Set the app to **Free**.
3. Add the app description, support contact, privacy details, category, and at least one screenshot.
4. Use the project license and privacy description. Review every field for accuracy.
5. Submit it for certification.

Microsoft signs a passed package and makes it available through the Microsoft Store. Future Store releases need a higher version number, a newly built package, and another certification submission.

## Direct downloads

GitHub releases can keep offering the existing `Setup.exe`. It will remain a separate delivery path. A direct EXE download needs its own Authenticode certificate to show a named verified publisher outside the Store.

Microsoft's Artifact Signing service is a separate option for direct downloads. It can identify the publisher, but a new signed app can still show a SmartScreen warning while reputation builds. The Store route is the reliable way to avoid SmartScreen download warnings for Store installs.

## References

- [Microsoft Store code-signing options](https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/code-signing-options)
- [Microsoft Store developer-account setup](https://learn.microsoft.com/en-us/windows/apps/publish/partner-center/open-a-developer-account)
- [Create an MSIX/AppX Store submission](https://learn.microsoft.com/en-us/windows/apps/publish/publish-your-app/msix/create-app-submission)
