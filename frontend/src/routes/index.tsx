import { createFileRoute } from '@tanstack/react-router'
import '../App.css'
import { Autocomplete, Box, Center, Flex, Title } from '@mantine/core'

export const Route = createFileRoute('/')({
  component: App,
})

function App() {
  return (
    <Center h={'100vh'} >
      <Flex direction="column" align="center" gap="md" mb="xl">
        <Flex direction="column" align="center" gap="sm">
          <Title order={1}>Welcome to PugInspect</Title>
          <Title order={3}>The ultimate Pug template linter and inspector</Title>
        </Flex>
        <Flex direction="column" align="center" gap="sm" mt="xl">
          <Autocomplete
            placeholder="Search for a Pug template"
            data={['index.pug', 'layout.pug', 'header.pug', 'footer.pug']}
            style={{ width: 300 }}
          />
      <Box mt="md" style={{ color: 'gray' }}>
        Start by typing in a character name above to search for a Pug template.
      </Box>
    </Flex>
      </Flex>     
    </Center>
  )
}
