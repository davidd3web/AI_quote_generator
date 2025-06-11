"use client"

import { quoteFormSchema } from '@/lib/validators'
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from './ui/form'
import { z } from 'zod'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'
import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Session } from '@supabase/auth-helpers-nextjs';
import { Alert, AlertDescription, AlertTitle } from './ui/alert'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { AlertTriangle, Copy, Eraser, Mail, Send, Share2, Terminal, Lock } from 'lucide-react'
import { Label } from './ui/label'
import { Checkbox } from './ui/checkbox'

const famousPersonSuggestions = [
    "Albert Einstein",
    "Maya Angelou",
    "Marcus Aurelius",
    "Steve Jobs",
    "Yoda" 
];

const toneSuggestions = [
    "Happy",
    "Serious",
    "Angry",
    "Jokingly"
];

type QuoteFormValues = z.infer<typeof quoteFormSchema>;

const AIGenerateForm = ({ session: serverSession }: { session: Session | null }) => {
    const [activeSession, setActiveSession] = useState(serverSession)
    const [generatedQuote, setGeneratedQuote] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isQuoteModalOpen,  setIsQuoteModalOpen] = useState<boolean>(false)
    const [isErrorModalOpen, setIsErrorModalOpen] = useState<boolean>(false)
    const [copied, setCopied] = useState<boolean>(false)

     // States for email functionality
     const [showEmailInput, setShowEmailInput] = useState<boolean>(false);
     const [emailRecipient, setEmailRecipient] = useState<string>("");
     const [isSendingEmail, setIsSendingEmail] = useState<boolean>(false);
     const [emailStatusMessage, setEmailStatusMessage] = useState<string | null>(null)
     const [subscribeDaily, setSubscribeDaily] = useState<boolean>(false)

     const supabase = createClientComponentClient()

      // Use an effect to listen for changes in authentication state
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log("Auth state changed, new session:", session);
            setActiveSession(session);
        });

        // Cleanup subscription on component unmount
        return () => subscription.unsubscribe();
    }, [supabase.auth]);

    const form = useForm<z.infer<typeof quoteFormSchema>>({
        resolver: zodResolver(quoteFormSchema),
        defaultValues: {
          famousPerson: "",
          tone: "",
          quoteType: "",
        },
    })

    async function onSubmit(values: QuoteFormValues) {
        setIsLoading(true);
        setGeneratedQuote(null);
        setError(null);
        setIsQuoteModalOpen(false)
        setIsErrorModalOpen(false)
        setShowEmailInput(false)
        setEmailStatusMessage(null)

        try {
            const response = await fetch('/api/generate-quote', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(values),
            });

            const responseData = await response.json(); // Read response body once

            if (!response.ok) {
                // Use message from responseData if available, otherwise default
                throw new Error(responseData.message || `Error: ${response.status}`);
            }

            setGeneratedQuote(responseData.quote);
            setIsQuoteModalOpen(true)

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            console.error("Failed to generate quote:", err);
            setError(err.message || "An unexpected error occurred. Please try again.");
            setIsErrorModalOpen(true)
        } finally {
            setIsLoading(false);
        }
    }

    const handleSuggestionClick = (personName: string) => {
        form.setValue('famousPerson', personName, { 
            shouldValidate: true, // Optional: validate after setting value
            shouldDirty: true     // Optional: mark field as dirty
        });
    };

    const handleToneClick = (toneSuggestion: string) => {
        form.setValue('tone', toneSuggestion, { 
            shouldValidate: true, // Optional: validate after setting value
            shouldDirty: true     // Optional: mark field as dirty
        });
    };

    const handleClearForm = () => {
        form.reset(); // Resets react-hook-form fields to defaultValues
        setGeneratedQuote(null);
        setError(null);
        setIsLoading(false); // Also reset loading state if clearing during loading (edge case)
        setIsQuoteModalOpen(false); 
        setIsErrorModalOpen(false)
        setShowEmailInput(false);
        setEmailRecipient("");
        setEmailStatusMessage(null);
    };

    const handleCopyToClipboard = () => {
        console.log("handleCopyToClipboard called");
        if (generatedQuote) {
            console.log("Generated Quote:", generatedQuote);

            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = generatedQuote;
            const plainText = tempDiv.textContent || tempDiv.innerText || "";
            console.log("Plain Text to Copy:", plainText);

            if (!plainText) {
                console.error("No plain text extracted to copy.");
                return;
            }

            const textarea = document.createElement('textarea');
            textarea.value = plainText; 

            // Styling to ensure the textarea is not visible and doesn't interfere with layout
            textarea.style.position = 'fixed';
            textarea.style.top = '0'; // Keep it in viewport for focus, but visually hidden
            textarea.style.left = '0';
            textarea.style.width = '1px';
            textarea.style.height = '1px';
            textarea.style.padding = '0';
            textarea.style.border = 'none';
            textarea.style.outline = 'none';
            textarea.style.boxShadow = 'none';
            textarea.style.background = 'transparent';
            textarea.style.opacity = '0'; // Visually hide
            
            document.body.appendChild(textarea);
            console.log("Textarea appended to body.");

            textarea.focus(); 
            console.log("Textarea focused.");
            // Explicitly set selection range
            textarea.setSelectionRange(0, plainText.length);
            console.log("Textarea selection range set.");

            let successful = false;
            try {
                successful = document.execCommand('copy');
                console.log("document.execCommand('copy') successful:", successful);
                if (successful) {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000); 
                } else {
                    console.error('Copy command was not successful via execCommand (returned false).');
                }
            } catch (err) {
                console.error('Error during execCommand("copy"):', err);
            } finally {
                document.body.removeChild(textarea);
                console.log("Textarea removed from body.");
            }
        } else {
            console.log("No generated quote to copy.");
        }
    };

    const handleShare = async () => {
        if (!generatedQuote) return;
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'AI Generated Quote',
                    text: generatedQuote,
                });
                console.log('Quote shared successfully');
            } catch (error) {
                console.error('Error sharing:', error);
                // Fallback or message if sharing fails
            }
        } else {
            // Fallback for browsers that don't support Web Share API
            handleCopyToClipboard(); 
            alert("Sharing not supported, quote copied to clipboard!"); // Simple alert, consider a nicer toast/message
        }
    };

    const handleSendEmail = async () => {
        if (!emailRecipient || !generatedQuote) return;
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRecipient)) {
            setEmailStatusMessage("Invalid email format.");
            return;
        }

        setIsSendingEmail(true);
        setEmailStatusMessage("Processing...");

        const originalQuoteParams = form.getValues();

        try {
            const endpoint = subscribeDaily ? '/api/subscribe' : '/api/send-email';
            
            // **MODIFICATION HERE**
            // For subscriptions, we now send the generated quote along with the parameters.
            const payload = subscribeDaily 
                ? { email: emailRecipient, quote: generatedQuote, ...originalQuoteParams } 
                : { email: emailRecipient, quote: generatedQuote };

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "Request failed.");
            
            setEmailStatusMessage(data.message || "Request successful!");
            setEmailRecipient("");
            setSubscribeDaily(false);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            setEmailStatusMessage(error.message || "An error occurred.");
        } finally {
            setIsSendingEmail(false);
            setTimeout(() => setEmailStatusMessage(null), 5000); 
        }
    };
    
    return (
        <div className="max-w-lg mx-auto p-4 space-y-6">
            <Form { ...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-12 max-w-lg mx-auto p-4">
                    <FormField
                        control={form.control}
                        name='famousPerson'
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Famous Person (optional)</FormLabel>
                                <FormControl>
                                    <Input placeholder='Add the voice from a famous person' { ...field } />
                                </FormControl>
                                <FormDescription>
                                    This is optional. If you want a quote written as this person would write it.
                                </FormDescription>
                                <div className="flex flex-wrap gap-2 pt-2">
                                    {famousPersonSuggestions.map((person) => (
                                        <Button
                                            key={person}
                                            type="button" 
                                            variant="outline"
                                            size="sm" 
                                            onClick={() => handleSuggestionClick(person)}
                                            className='cursor-pointer rounded-[16px]'
                                        >
                                            {person}
                                        </Button>
                                    ))}
                                </div>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name='tone'
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Tone of Quote (optional)</FormLabel>
                                <FormControl>
                                    <Input placeholder='A happy quote...' { ...field } />
                                </FormControl>
                                <FormDescription>
                                    This is optional. Choose the tone for your quote.
                                </FormDescription>
                                <div className="flex flex-wrap gap-2 pt-2">
                                    {toneSuggestions.map((tone) => (
                                        <Button
                                            key={tone}
                                            type="button" 
                                            variant="outline"
                                            size="sm" 
                                            onClick={() => handleToneClick(tone)}
                                            className='cursor-pointer rounded-[16px]'
                                        >
                                            {tone}
                                        </Button>
                                    ))}
                                </div>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name='quoteType'
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Your Quote</FormLabel>
                                <FormControl>
                                    <Textarea
                                        placeholder="E.g., 'A quote about the importance of learning from failure for entrepreneurs.'"
                                        className="resize-none"
                                        rows={4}
                                        {...field}
                                    />
                                </FormControl>
                                <FormDescription>
                                    This is required. Enter the description of your quote.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <div className="flex flex-col sm:flex-row gap-2">
                        <Button type='submit' className="w-full sm:flex-1" disabled={isLoading}>
                            {isLoading ? "Generating..." : "Generate AI Quote"}
                        </Button>
                        <Button 
                            type='button' 
                            variant="outline" 
                            className="w-full sm:w-auto" 
                            onClick={handleClearForm}
                            disabled={isLoading} // Optionally disable while generating
                        >
                            <Eraser className="mr-2 h-4 w-4" /> Clear Form
                        </Button>
                    </div>
                </form>
            </Form>

            {isLoading && !isSendingEmail && (
                <div className="flex justify-center items-center pt-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <p className="ml-2">Generating your quote...</p>
                </div>
            )}

            {error && !isLoading && (
                 <Alert variant="destructive" className="mt-4">
                    <Terminal className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <Dialog open={isQuoteModalOpen} onOpenChange={(isOpen) => {
                setIsQuoteModalOpen(isOpen);
                if (!isOpen) { // Reset email UI when quote modal closes
                    setShowEmailInput(false);
                    setEmailRecipient("");
                    // setEmailStatusMessage(null);
                }
            }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Your AI Generated Quote</DialogTitle>
                        <DialogDescription>
                            Here&apos;s the quote generated based on your input.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 whitespace-pre-wrap text-lg">
                        {generatedQuote}
                    </div>

                    {/* Email Input Section - Toggled */}
                    {showEmailInput && (
                        <div className="space-y-3 pt-4 border-t mt-4">
                            <Label htmlFor="email-recipient" className="text-sm font-medium">Send quote to email:</Label>
                            <div className="flex items-center space-x-2">
                                <Input
                                    id="email-recipient"
                                    type="email"
                                    placeholder="recipient@example.com"
                                    value={emailRecipient}
                                    onChange={(e) => setEmailRecipient(e.target.value)}
                                    disabled={isSendingEmail}
                                />
                                <Button type="button" onClick={handleSendEmail} disabled={isSendingEmail || !emailRecipient}>
                                    <Send className="mr-2 h-4 w-4" />
                                    {isSendingEmail ? "Sending..." : "Send"}
                                </Button>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox 
                                    id="daily-subscribe" 
                                    checked={subscribeDaily} 
                                    onCheckedChange={(checked) => setSubscribeDaily(Boolean(checked))} 
                                    disabled={!activeSession} // <-- KEY CHANGE
                                />
                                <Label 
                                    htmlFor="daily-subscribe" 
                                    className={`text-sm font-normal ${!activeSession ? 'text-gray-400' : ''}`}
                                >
                                    Send me a new quote with these parameters daily
                                </Label>
                            </div>
                            {!activeSession && (
                                <p className="text-xs text-yellow-600 flex items-center gap-1">
                                    <Lock className="h-3 w-3" />
                                    Please sign in to enable daily subscriptions.
                                </p>
                            )}
                            {emailStatusMessage && (
                                <p className={`text-sm ${emailStatusMessage.includes("Failed") || emailStatusMessage.includes("Invalid") || emailStatusMessage.includes("error occurred") ? "text-destructive" : "text-green-600"}`}>
                                    {emailStatusMessage}
                                </p>
                            )}
                        </div>
                    )}
                    
                    <DialogFooter className="sm:grid sm:grid-cols-3 sm:gap-2 items-center pt-4 mt-2">
                         <Button type="button" variant="outline" onClick={handleCopyToClipboard} className="w-full cursor-pointer">
                            <Copy className="mr-2 h-4 w-4" /> {copied ? "Copied!" : "Copy"}
                        </Button>
                        <Button type="button" variant="outline" onClick={handleShare} className="w-full cursor-pointer">
                            <Share2 className="mr-2 h-4 w-4r" /> Share
                        </Button>
                         <Button type="button" variant="outline" onClick={() => {
                                setShowEmailInput(!showEmailInput);
                                if (showEmailInput) { // If we are hiding it, clear status
                                    setEmailStatusMessage(null);
                                }
                            }} className="w-full cursor-pointer">
                            <Mail className="mr-2 h-4 w-4" /> {showEmailInput ? "Cancel Email" : "Email Quote"}
                        </Button>
                        {/* Original DialogClose is removed to make space and use the three buttons above */}
                        {/* Instead, clicking outside or pressing Esc will close, or user can toggle email UI */}
                    </DialogFooter>
                     <DialogClose asChild className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground cursor-pointer">
                    </DialogClose>
                </DialogContent>
            </Dialog>

            {/* Modal for Displaying Errors */}
            <Dialog open={isErrorModalOpen} onOpenChange={setIsErrorModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <div className="flex items-center">
                            <AlertTriangle className="mr-2 h-6 w-6 text-destructive" />
                            <DialogTitle className="text-destructive">An Error Occurred</DialogTitle>
                        </div>
                        <DialogDescription>
                           Please review the error message below.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 text-destructive">
                        {error}
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="outline" onClick={() => setIsErrorModalOpen(false)}>
                                Close
                            </Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
        // Generate AI Quote Button
        
    );
}
 
export default AIGenerateForm;