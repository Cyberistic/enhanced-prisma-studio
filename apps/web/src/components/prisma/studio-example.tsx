import {
	AdapterProvider,
	PrismaConsole,
	PrismaLogs,
	PrismaProviders,
	PrismaSQL,
	PrismaStudio,
	PrismaStudioContent,
	PrismaStudioSection,
	PrismaStudioSectionHeader,
	PrismaTables,
	PrismaTablesSearchHeader,
	PrismaVisualizer,
	URLProvider,
} from "@/components/prisma/studio";
import { createSQLiteDrizzleProvider, createSQLiteKyselyProvider } from "@/components/prisma/providers/adapters";
import { createNuqsPrismaAdapter, createTanStackRouterAdapter } from "@/components/prisma/providers/url";
import { PrismaEvilStats } from "@/components/prisma/components/prisma-studio-components";
import { StudioSectionHeader } from "@/components/prisma/components/studio-section-header";
import type { StudioThemeInput } from "@/components/prisma/types";
import { executeStudioRequest } from "@/components/prisma/utils/studio-request";

export function PrismaStudioExample(props: { theme: StudioThemeInput }) {
	const { theme } = props;

	return (
		<PrismaStudio theme={theme}>
			{/* Providers for URL, DB actions, DB query builder */}
			<PrismaProviders>
				<URLProvider adapter={createNuqsPrismaAdapter()} />
				<AdapterProvider
					adapter={createSQLiteKyselyProvider({ executeStudioRequest })}
				/>
			</PrismaProviders>

			{/* Studio content here, auto populates sidebar and view wiring based on section definitions */}
			<PrismaStudioContent>

				{/* Default section with Console, SQL, and Visualizer views */}
				<PrismaStudioSection>
					<PrismaStudioSectionHeader>
						<StudioSectionHeader />
					</PrismaStudioSectionHeader>
					<PrismaConsole />
					<PrismaSQL />
					<PrismaVisualizer />
				</PrismaStudioSection>

				{/* Tables section with table names listed  */}
				<PrismaStudioSection>
					<PrismaStudioSectionHeader>
						<PrismaTablesSearchHeader />
					</PrismaStudioSectionHeader>
					<PrismaTables />
				</PrismaStudioSection>
			</PrismaStudioContent>
		</PrismaStudio>
	);
}
