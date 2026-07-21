export interface DataRow {
 Timestamp: string;
 Date: string;
'Branch အမည်': string;
'Customer Service အမည်': string;
'ပို့ဆောင်ပေးခဲ့သော အရောင်းကောင်တာ တာဝန်ခံ အမည်': string;
'အရောင်းသမားအမည်'?: string;
'ဝယ်သူ အမည်'?: string;
'တဖွဲ့တွင်ပါဝင်သောလူဦးရေ': string;
'ဆိုင်သို့လာသောအကြောင်းအရင်း'?: string;
'အကြောင်းအရာ'?: string;
'ထူးခြားဖြစ်စဉ်'?: string;
 [key: string]: any;
}

export interface StaffProfile {
 photo?: string;
 joinDate?: string;
 phone?: string;
 email?: string;
 position?: string;
}
