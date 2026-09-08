import { useQuery } from "@tanstack/react-query";
import { execute } from "../api/graphqlClient";
import { graphql } from "../graphql";
import { CompanionTelemetryQuery, CompanionTelemetryQueryVariables } from "../graphql/graphql";

const query = graphql(`
  query CompanionTelemetry($token: String!) {
    companionTelemetry(token: $token) {
      windowDays
      newestReport
      beatsThisWeek
      newThisWindow
      runtimeBeats
      funnel {
        installs
        activated
        activeThisWeek
        never
        neverNoWindow
      }
      links {
        link
        beats
        installs
      }
      growth {
        date
        count
      }
      versions {
        version
        count
      }
      stranded {
        from
        to
        installs
        failures
      }
      cohorts {
        start
        end
        size
        day1
        day7
        pending
        daysToWait
      }
      runtime {
        date
        count
      }
      sessions {
        bucket
        percent
      }
      lookups {
        total
        notFound
        errors
      }
      cap {
        limit
        beats
        installs
        maxTotal
      }
      installs {
        installId
        firstSeen
        lastSeen
        version
        region
        country
        activatedAt
        link
      }
      regions {
        region
        count
      }
      countries {
        country
        count
      }
    }
  }
`);

export type CompanionTelemetry = CompanionTelemetryQuery["companionTelemetry"];

/** The token is the only credential this page has, so a wrong one is a normal
 *  outcome rather than a failure to retry — the caller renders the prompt again. */
export const useCompanionTelemetry = (token: string) =>
  useQuery({
    queryKey: ["companionTelemetry", token],
    enabled: token.length > 0,
    retry: false,
    refetchInterval: 60_000,
    queryFn: async (): Promise<CompanionTelemetry> => {
      const response = await execute<CompanionTelemetryQuery, CompanionTelemetryQueryVariables>(query, { token });
      return response.companionTelemetry;
    },
  });
