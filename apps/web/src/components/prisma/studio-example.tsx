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
import { createSQLiteDrizzleProvider } from "@/components/prisma/providers/adapters";
import { createTanStackRouterAdapter } from "@/components/prisma/providers/url";
import { PrismaEvilStats } from "@/components/prisma/components/prisma-studio-components";
import { StudioSectionHeader } from "@/components/prisma/components/studio-section-header";
import type { StudioThemeInput } from "@/components/prisma/types";
import { executeStudioRequest } from "@/components/prisma/utils/studio-request";

export function PrismaStudioExample(props: { theme: StudioThemeInput }) {
	const { theme } = props;

	return (
		<PrismaStudio theme={theme}>
			<PrismaProviders>
				<URLProvider adapter={createTanStackRouterAdapter()} />
				<AdapterProvider
					adapter={createSQLiteDrizzleProvider({ executeStudioRequest })}
				/>
			</PrismaProviders>
			<PrismaStudioContent>
				<PrismaStudioSection>
					<PrismaStudioSectionHeader>
						<StudioSectionHeader />
					</PrismaStudioSectionHeader>
					<PrismaConsole />
					<PrismaSQL />
					<PrismaVisualizer />
				</PrismaStudioSection>

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
