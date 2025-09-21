import { Container } from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";
import Header from "../components/header";

const character: React.FC = () => {
  return (
    <Container>
      <Header />
    </Container>
  );
};

export const Route = createFileRoute("/character")({
  component: character,
});
