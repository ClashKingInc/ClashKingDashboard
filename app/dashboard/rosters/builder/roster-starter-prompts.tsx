import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const prompts = [
  { title: "Build a CWL lineup", prompt: "Build a balanced 30-player CWL lineup from the selected rosters using Town Hall, hero completion and recent war performance. Show the proposed lineup before making any roster changes." },
  { title: "Compare war performance", prompt: "Show the selected rosters' last 90-day regular-war hit rates (excluding CWL and friendly wars), CWL-only hit rates, attack counts, hero completion and questionnaire answers. Compare regular-war hit rates with the global baseline for each player's Town Hall." },
  { title: "Find linked accounts", prompt: "Group players in the selected rosters by their linked Discord identity and show everyone with multiple accounts, including player names, tags and Town Halls." },
  { title: "Review activity and signup answers", prompt: "Show players in the selected rosters with their last activity, hero completion and all roster questionnaire answers so I can review who is ready for the lineup." },
] as const;

export function RosterStarterPrompts({ onChoose }: { readonly onChoose: (prompt: string) => void }) {
  return (
    <div className="mx-auto mt-8 w-full max-w-xl space-y-1 text-left" aria-label="Roster prompt suggestions">
      {prompts.map(({ title, prompt }) => (
        <Button key={title} type="button" variant="ghost" className="h-auto w-full justify-between gap-4 rounded-xl px-4 py-3 text-left text-sm font-normal text-muted-foreground hover:bg-muted/55 hover:text-foreground" onClick={() => onChoose(prompt)}>
          <span className="whitespace-normal">{title}</span>
          <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
        </Button>
      ))}
    </div>
  );
}
