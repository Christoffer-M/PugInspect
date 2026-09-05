import { createFileRoute } from "@tanstack/react-router";
import { Container, List, Stack, Text, Title } from "@mantine/core";
import { Page } from "../components/layout/Page";

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
            <Text>
              The PugInspect Companion desktop application reports separately,
              to our own servers rather than to Umami, roughly every half hour
              while it is running. Each report contains:
            </Text>
            <List>
              <List.Item>
                An installation identifier: a random value generated once by the
                app and stored on your computer. It is not derived from your
                hardware, your account, or anything about you &mdash; it exists
                only so that repeat reports from one installation can be counted
                as one installation rather than many.
              </List.Item>
              <List.Item>The version of the application</List.Item>
              <List.Item>
                Whether the app is currently able to read the game window, so we
                can tell how often setup fails
              </List.Item>
              <List.Item>
                Whether a group listing is for a raid or for Mythic+, its
                difficulty, its region, and how many applicants it has
              </List.Item>
              <List.Item>
                How many characters were looked up, and how many of those
                lookups failed
              </List.Item>
              <List.Item>Which of the app&rsquo;s own settings are enabled</List.Item>
              <List.Item>
                Whether an application update is waiting to be installed, and
                how many update attempts have failed, so we can tell when the
                updater is leaving people stranded on an old version
              </List.Item>
              <List.Item>
                The country your connection comes from. Your IP address is used
                to determine this and is then discarded &mdash; it is never
                stored.
              </List.Item>
            </List>
            <Text>
              It never reports character names, realms, the title of your
              listing, or the identity of any applicant. Turning off
              &ldquo;Send anonymous usage statistics&rdquo; under Settings in
              the companion stops all reporting, including the installation
              identifier.
            </Text>
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
              Website analytics data is processed by Umami Cloud on our
              behalf. Companion application data is processed on our own
              servers and is not shared with any third party. We do not sell
              data.
            </Text>
          </Stack>

          <Stack gap="xs">
            <Title order={2}>Data Retention</Title>
            <Text>
              Website analytics data is retained only as long as necessary for
              statistical analysis. Individual companion reports are deleted
              after 90 days. The installation identifier and the dates it was
              first and last seen are kept for 24 months after the last report,
              so that year-on-year usage can be compared, and are then deleted.
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
  head: () => ({
    meta: [{ title: "Privacy Policy | PugInspect" }],
    links: [{ rel: "canonical", href: "https://puginspect.com/privacy-policy" }],
  }),
  component: PrivacyPolicy,
});
