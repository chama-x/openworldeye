import CommandDeck from "@/CommandDeck";
import { DataLayersProvider } from "@/contexts/DataLayersContext";
import { GlobalClockProvider } from "@/contexts/GlobalClockContext";
import { OsintDataProvider } from "@/contexts/OsintDataContext";
import { SelectionProvider } from "@/contexts/SelectionContext";

export default function App() {
  return (
    <GlobalClockProvider>
      <DataLayersProvider>
        <OsintDataProvider>
          <SelectionProvider>
            <CommandDeck />
          </SelectionProvider>
        </OsintDataProvider>
      </DataLayersProvider>
    </GlobalClockProvider>
  );
}
