import Link from "next/link";
import { CheckCircle, ArrowRight } from "lucide-react";

export default function PricingPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Simple, Transparent Pricing
          </h1>
         <p className="text-xl text-slate-600 dark:text-slate-400 mb-8 max-w-3xl mx-auto">
            Choose the plan that fits your needs. Start free and upgrade when you&apos;re ready.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            <PricingCard
              name="Free"
              price="$0"
              period="forever"
              description="Perfect for personal use and getting started"
              features={[
                "Up to 50 transactions/month",
                "5 expense groups",
                "Basic analytics",
                "Email notifications",
                "Mobile app access",
              ]}
              cta="Get Started"
              highlighted={false}
            />
            <PricingCard
              name="Pro"
              price="$9"
              period="month"
              description="For individuals who need more power"
              features={[
                "Unlimited transactions",
                "Unlimited groups",
                "Advanced analytics",
                "AI-powered insights",
                "Receipt scanning (50/month)",
                "Priority support",
                "Export reports",
              ]}
              cta="Start Free Trial"
              highlighted={true}
            />
            <PricingCard
              name="Business"
              price="$29"
              period="month"
              description="For teams and businesses"
              features={[
                "Everything in Pro",
                "Unlimited team members",
                "Admin dashboard",
                "Custom branding",
                "API access",
                "SSO integration",
                "Dedicated support",
                "Unlimited receipt scanning",
              ]}
              cta="Contact Sales"
              highlighted={false}
            />
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4 bg-slate-50 dark:bg-slate-900">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <FAQItem
              question="Is there a free trial?"
              answer="Yes! All paid plans come with a 14-day free trial. No credit card required to start."
            />
            <FAQItem
              question="Can I change plans anytime?"
              answer="Absolutely. You can upgrade or downgrade your plan at any time. Changes take effect immediately."
            />
            <FAQItem
              question="What payment methods do you accept?"
              answer="We accept all major credit cards, PayPal, and bank transfers for annual plans."
            />
            <FAQItem
              question="Is my data secure?"
              answer="Yes. We use bank-level encryption, secure authentication, and follow industry best practices for data protection."
            />
            <FAQItem
              question="Can I export my data?"
              answer="Yes, you can export all your data at any time in multiple formats including CSV, PDF, and JSON."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to Get Started?</h2>
          <p className="text-xl mb-8 opacity-90">
            Start your free trial today and see how SplitLedger AI can transform your expense management.
          </p>
          <Link
            href="/sign-up"
            className="inline-flex items-center px-8 py-4 bg-white text-blue-600 rounded-lg font-semibold hover:bg-slate-100 transition-colors"
          >
            Start Free Trial
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}

function PricingCard({ name, price, period, description, features, cta, highlighted }: any) {
  return (
    <div className={`p-8 rounded-2xl shadow-lg ${highlighted ? 'bg-gradient-to-br from-blue-600 to-purple-600 text-white scale-105' : 'bg-white dark:bg-slate-800'}`}>
      <h3 className="text-2xl font-bold mb-2">{name}</h3>
      <div className="mb-4">
        <span className="text-4xl font-bold">{price}</span>
        <span className={`text-sm ${highlighted ? 'text-white/80' : 'text-slate-600 dark:text-slate-400'}`}>/{period}</span>
      </div>
      <p className={`mb-6 ${highlighted ? 'text-white/90' : 'text-slate-600 dark:text-slate-400'}`}>{description}</p>
      <ul className="space-y-3 mb-8">
        {features.map((feature: string, index: number) => (
          <li key={index} className="flex items-center">
            <CheckCircle className="h-5 w-5 mr-3 flex-shrink-0" />
            {feature}
          </li>
        ))}
      </ul>
      <button className={`w-full py-3 rounded-lg font-semibold transition-colors ${highlighted ? 'bg-white text-blue-600 hover:bg-slate-100' : 'bg-primary text-white hover:bg-primary/90'}`}>
        {cta}
      </button>
    </div>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow">
      <h3 className="text-lg font-semibold mb-2">{question}</h3>
      <p className="text-slate-600 dark:text-slate-400">{answer}</p>
    </div>
  );
}
