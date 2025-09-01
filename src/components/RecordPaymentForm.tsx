
'use client';

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Debt, Payment } from '@/lib/types';
import { transcribeAudio } from '@/ai/flows/transcribe-audio-flow';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Mic, MicOff, Loader2 } from 'lucide-react';


const paymentSchema = z.object({
  amount: z.coerce.number().positive({ message: 'Please enter a positive amount.' }),
  reason: z.string().optional(),
});

type PaymentFormValues = Omit<z.infer<typeof paymentSchema>, 'id' | 'date'>;

interface RecordPaymentFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: Omit<Payment, 'id'>) => void;
  debt: Debt | null;
}

export function RecordPaymentForm({ isOpen, onClose, onSubmit, debt }: RecordPaymentFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);


  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
  });

  const remainingAmount = debt ? debt.amount - (debt.paidAmount || 0) : 0;

  useEffect(() => {
    if (isOpen) {
      form.reset({
        amount: undefined,
        reason: '',
      });
      // Update the schema dynamically to enforce max amount
      paymentSchema.extend({
         amount: z.coerce.number().positive().max(remainingAmount, {message: `Amount cannot exceed remaining balance of ${remainingAmount}`})
      });

    }
  }, [isOpen, form, remainingAmount]);
  

  const handleMicClick = async () => {
    if (isRecording) {
      mediaRecorder?.stop();
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const newMediaRecorder = new MediaRecorder(stream);
        setMediaRecorder(newMediaRecorder);
        
        newMediaRecorder.ondataavailable = (event) => {
          setAudioChunks(prev => [...prev, event.data]);
        };

        newMediaRecorder.onstop = async () => {
          setIsTranscribing(true);
          const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64Audio = reader.result as string;
            try {
                const transcription = await transcribeAudio({audioDataUri: base64Audio});
                const currentReason = form.getValues('reason') || '';
                form.setValue('reason', `${currentReason}${currentReason ? ' ' : ''}${transcription.text}`);
                toast({ title: "Transcription successful!"});
            } catch (error) {
                toast({ title: "Transcription Failed", description: "Could not transcribe audio. Please try again.", variant: "destructive" });
                console.error(error);
            } finally {
                setIsTranscribing(false);
                setAudioChunks([]);
                 // Stop all tracks on the stream to turn off the mic indicator
                stream.getTracks().forEach(track => track.stop());
            }
          };
        };

        newMediaRecorder.start();
        setIsRecording(true);
      } catch (error) {
        toast({ title: "Microphone Access Denied", description: "Please enable microphone permissions in your browser.", variant: "destructive"});
      }
    }
  };


  const handleFormSubmit = async (values: PaymentFormValues) => {
    setIsSubmitting(true);
    const finalValues = {
      ...values,
      date: new Date().toISOString(),
    };
    await onSubmit(finalValues);
    setIsSubmitting(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>
            Record a payment for {debt?.personName}. Remaining balance is <strong>{remainingAmount.toFixed(2)} PKR</strong>.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount Paid/Received</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason (Optional)</FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Textarea placeholder="Type or use the mic to record a reason..." {...field} />
                    </FormControl>
                    <Button 
                        type="button" 
                        size="icon" 
                        variant="ghost" 
                        onClick={handleMicClick}
                        disabled={isTranscribing}
                        className="absolute bottom-2 right-2 h-7 w-7"
                    >
                      {isTranscribing ? <Loader2 className="h-4 w-4 animate-spin"/> : (isRecording ? <MicOff className="h-4 w-4 text-red-500" /> : <Mic className="h-4 w-4" />)}
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
             <DialogFooter>
                <Button type="submit" disabled={isSubmitting || isRecording || isTranscribing}>
                    {isSubmitting ? 'Saving...' : 'Save Payment'}
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
