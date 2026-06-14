export const LANGUAGE_OPTIONS = [
  { value: "javascript", label: "JavaScript", monaco: "javascript" },
  { value: "java", label: "Java", monaco: "java" },
  { value: "python", label: "Python", monaco: "python" },
  { value: "cpp", label: "C++", monaco: "cpp" }
];

export const STARTER_SNIPPETS = {
  javascript: `function twoSum(nums, target) {
  const seen = new Map();

  for (let index = 0; index < nums.length; index += 1) {
    const complement = target - nums[index];

    if (seen.has(complement)) {
      return [seen.get(complement), index];
    }

    seen.set(nums[index], index);
  }

  return [];
}`,
  java: `import java.util.HashMap;
import java.util.Map;

class Solution {
    public int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> seen = new HashMap<>();

        for (int index = 0; index < nums.length; index++) {
            int complement = target - nums[index];

            if (seen.containsKey(complement)) {
                return new int[]{seen.get(complement), index};
            }

            seen.put(nums[index], index);
        }

        return new int[]{};
    }
}`,
  python: `def two_sum(nums, target):
    seen = {}

    for index, value in enumerate(nums):
        complement = target - value
        if complement in seen:
            return [seen[complement], index]

        seen[value] = index

    return []`,
  cpp: `#include <unordered_map>
#include <vector>
using namespace std;

vector<int> twoSum(vector<int>& nums, int target) {
    unordered_map<int, int> seen;

    for (int index = 0; index < nums.size(); index++) {
        int complement = target - nums[index];

        if (seen.count(complement)) {
            return {seen[complement], index};
        }

        seen[nums[index]] = index;
    }

    return {};
}`
};

export const INITIAL_CHAT = [
  {
    role: "assistant",
    content: "Ask me anything about your code — optimization, explanation, debugging, or best practices. I only answer code-related questions."
  }
];

export const INITIAL_REVIEW_MARKDOWN = [
  "## AI Review",
  "",
  "Click **Review Code** to generate a readable analysis with summary, errors, complexity, and improvement suggestions."
].join("\n");
