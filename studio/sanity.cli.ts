import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: 'c7b8chvo',
    dataset: 'production',
  },
  deployment: {
    /**
     * Enable auto-updates for studios.
     * Learn more at https://www.sanity.io/docs/studio/latest-version-of-sanity#k47faf43faf56
     */
    autoUpdates: true,
    appId: 'p4wazja8bkufew89honqpmvu',
  },
})
