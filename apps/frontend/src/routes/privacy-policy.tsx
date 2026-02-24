import { createFileRoute } from "@tanstack/react-router";
import { Container, List, Stack, Text, Title } from "@mantine/core";
import { Page } from "../components/Page";

const PrivacyPolicy: React.FC = () => {
  return (
    <Page>
      <Container py="xl" maw={720}>
        <Stack gap="lg">
          <Title order={1}>Privacy Policy</Title>
          <Text>This website is a non-commercial fan project.</Text>

          <Stack gap="xs">
            <Title order={2}>Analytics</Title>
            <Text>
              We use Umami Cloud Analytics to collect anonymous usage statistics
              in order to improve the website.
            </Text>
            <Text>The data collected may include:</Text>
            <List>
              <List.Item>Pages visited</List.Item>
              <List.Item>Browser and device type</List.Item>
              <List.Item>Referrer information</List.Item>
              <List.Item>Approximate geographic region</List.Item>
              <List.Item>Timestamp of visits</List.Item>
              <List.Item>IP address (processed in anonymized form)</List.Item>
            </List>
            <Text>No cookies are used for analytics purposes.</Text>
          </Stack>

          <Stack gap="xs">
            <Title order={2}>Legal Basis</Title>
            <Text>
              Analytics data is processed under the legal basis of legitimate
              interest (Article 6(1)(f) GDPR) to improve the functionality and
              performance of the website.
            </Text>
          </Stack>

          <Stack gap="xs">
            <Title order={2}>Data Sharing</Title>
            <Text>
              Analytics data is processed by Umami Cloud on our behalf. We do
              not sell or share data with third parties.
            </Text>
          </Stack>

          <Stack gap="xs">
            <Title order={2}>Data Retention</Title>
            <Text>
              Analytics data is retained only as long as necessary for
              statistical analysis.
            </Text>
          </Stack>

          <Stack gap="xs">
            <Title order={2}>Your Rights</Title>
            <Text>
              Under GDPR, you have the right to access, rectify, or request
              deletion of your personal data. For privacy inquiries, contact:{" "}
              christoffer_rm@outlook.com
            </Text>
          </Stack>
        </Stack>
      </Container>
    </Page>
  );
};

export const Route = createFileRoute("/privacy-policy")({
  component: PrivacyPolicy,
});
