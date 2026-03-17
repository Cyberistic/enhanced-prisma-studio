import {
	AdapterProvider,
	createPrismaStudioAdapter,
} from "@/components/prisma/providers/adapters";
import {
	URLProvider,
	createTanStackRouterAdapter,
} from "@/components/prisma/providers/url";
import {
	PrismaConsole,
	PrismaSQL,
	PrismaStudio,
	PrismaStudioContent,
	PrismaStudioSection,
	PrismaStudioSectionHeader,
	PrismaTables,
	PrismaTablesSearchHeader,
	PrismaVisualizer,
} from "@/components/prisma/studio";
import { PrismaEvilStats } from "@/components/prisma/components/prisma-studio-components";
import { StudioSectionHeader } from "@/components/prisma/components/studio-section-header";
import type { StudioThemeInput } from "@/components/prisma/types";
import { executeStudioRequest } from "@/components/prisma/utils/studio-request";

export function PrismaStudioExample(props: { theme: StudioThemeInput }) {
	const { theme } = props;

	return (
		<PrismaStudio theme={theme}>
			<URLProvider adapter={createTanStackRouterAdapter()}>
				<AdapterProvider adapter={createPrismaStudioAdapter({ executeStudioRequest })}>
					<PrismaStudioContent>
						<PrismaStudioSection>
							<PrismaStudioSectionHeader>
								<StudioSectionHeader />
							</PrismaStudioSectionHeader>
							<PrismaConsole />
							<PrismaSQL />
							<PrismaVisualizer />
							<PrismaEvilStats />
						</PrismaStudioSection>

						<PrismaStudioSection>
							<PrismaStudioSectionHeader>
								<PrismaTablesSearchHeader />
							</PrismaStudioSectionHeader>
							<PrismaTables />
						</PrismaStudioSection>
					</PrismaStudioContent>
				</AdapterProvider>
			</URLProvider>
		</PrismaStudio>
	);
}
