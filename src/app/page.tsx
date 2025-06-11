import AIGenerateForm from "@/components/AIGenerateForm";
import Header from "@/components/Header/page";


export default function Home() {
  return (
    <main className="h-full">
      <Header />
      <div className="flex flex-col items-center justify-center h-full max-w-[1440px] md:max-w-[800px] m-auto">
        <h1 className="text-8xl md:text-6xl pb-3 text-center">Generate A Quote</h1>
        <p className="text-center text-base max-w-prose">This is a quote generator. You can select a person of interest that  this generator will replicate and also the tone in which you want the quote to be. Please give a description of the quote</p>
        <div className="mt-12">
          <AIGenerateForm />
        </div>
      </div>
    </main>
  );
}
