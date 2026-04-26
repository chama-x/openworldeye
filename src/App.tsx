import CommandDeck from "@/CommandDeck";
import { DataLayersProvider } from "@/contexts/DataLayersContext";
import { GlobalClockProvider } from "@/contexts/GlobalClockContext";
import { OsintDataProvider } from "@/contexts/OsintDataContext";

export default function App() {
  return (
    <GlobalClockProvider>
      <DataLayersProvider>
        <OsintDataProvider>
          <CommandDeck />
        </OsintDataProvider>
      </DataLayersProvider>
    </GlobalClockProvider>
  );
}
