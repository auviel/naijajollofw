import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {schemaTypes} from './schemaTypes'

export default defineConfig({
  name: 'naija-jollof',
  title: 'Naija Jollof',
  projectId: 'c7b8chvo',
  dataset: 'production',
  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title('Content')
          .items([S.documentTypeListItem('post').title('Posts')]),
    }),
  ],
  schema: {
    types: schemaTypes,
  },
})
