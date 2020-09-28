name := "spark-eks-example-application"

version := "v2"

scalaVersion := "2.12.11"

// additional librairies
libraryDependencies ++= {
  Seq(
    "org.apache.spark" %% "spark-core" % "3.0.0" % "provided",
    "org.apache.spark" %% "spark-sql" % "3.0.0" % "provided",
    "org.apache.hadoop" % "hadoop-aws" % "3.2.0",
    "com.amazonaws" % "aws-java-sdk" % "1.11.375",
    "org.scalactic" %% "scalactic" % "3.1.0",
    "org.scalatest" %% "scalatest" % "3.1.0" % Test
  )

}

assemblyShadeRules in assembly := Seq(
  ShadeRule.rename("javax.xml.stream.**" -> "shaded-javax.xml.stream.@1").inLibrary("javax.xml.stream" % "stax-api" % "1.0-2"),
  ShadeRule.rename("com.amazonaws.**" -> "shaded-com.amazonaws.@1").inLibrary("com.amazonaws" % "aws-java-sdk-bundle" % "1.11.375"),
  ShadeRule.rename("*" -> "shaded-@1").inLibrary("com.fasterxml.jackson.core" % "jackson-core" % "2.10.0"),
  ShadeRule.rename("*" -> "shaded2-@1").inLibrary("com.fasterxml.jackson.core" % "jackson-databind" % "2.10.0"),
  ShadeRule.rename("mozilla.**" -> "shaded-mozilla.@1").inLibrary("com.amazonaws" % "aws-java-sdk-bundle" % "1.11.375"),
)

assemblyMergeStrategy in assembly := {
  case "mime.types" => MergeStrategy.rename
  case x if x.contains("versions.properties") => MergeStrategy.rename
  case x =>
    val oldStrategy = (assemblyMergeStrategy in assembly).value
    oldStrategy(x)
}

// testing configuration
fork in Test := true
test in assembly := {}
javaOptions ++= Seq("-Xms512M", "-Xmx2048M", "-XX:MaxPermSize=2048M", "-XX:+CMSClassUnloadingEnabled")
parallelExecution in Test := false