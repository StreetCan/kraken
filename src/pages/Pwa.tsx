import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const steps = [
  {
    title: "Open Kraken in Safari (not any other browser)",
    image: "/pwa-step-1.png",
    alt: "Kraken opened in Safari on iOS",
  },
  {
    title: "Tap on the Share button",
    image: "/pwa-step-2.png",
    alt: "Safari share button highlighted",
  },
  {
    title: "Tap on Add to Homescreen",
    image: "/pwa-step-3.png",
    alt: "Add to Home Screen option in share sheet",
  },
  {
    title: "Tap Add",
    image: "/pwa-step-4.png",
    alt: "Confirm add to home screen prompt",
  },
];

const Pwa = () => {
  return (
    <div className="min-h-screen bg-background py-8">
      <header className="max-w-[1700px] mx-auto px-4 mb-6">
        <div className="bg-card dark:bg-card rounded-lg shadow-sm p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold">Install Kraken as a PWA</h1>
              <p className="text-sm text-muted-foreground">
                Follow these steps to add Kraken to your home screen.
              </p>
            </div>
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-[1700px] mx-auto px-4">
        <div className="bg-card dark:bg-card rounded-lg shadow-sm p-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => (
              <div
                key={step.title}
                className="flex flex-col gap-4 rounded-lg border border-border/60 bg-background p-4"
              >
                <div className="text-sm font-semibold text-muted-foreground">
                  Step {index + 1}
                </div>
                <div className="text-base font-medium">{step.title}</div>
                <div className="overflow-hidden rounded-md border border-border/60 bg-muted/30">
                  <img
                    src={step.image}
                    alt={step.alt}
                    className="h-48 w-full object-cover"
                    loading="lazy"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Pwa;
