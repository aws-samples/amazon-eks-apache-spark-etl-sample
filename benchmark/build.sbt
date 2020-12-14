name := "eks-spark-benchmark"

version := "3.0.1"

scalaVersion := "2.12.11"

javacOptions ++= Seq("-source", "1.11", "-target", "1.11")

// Dependencies required for this project
libraryDependencies ++= Seq(
  "org.apache.spark" %% "spark-core" % "3.0.1" % "provided",
  "org.apache.spark" %% "spark-sql" % "3.0.1" % "provided",
  "org.apache.hadoop" % "hadoop-aws" % "3.2.0",
  "com.amazonaws" % "aws-java-sdk" % "1.11.375",
  // JSON serialization
  "org.json4s" %% "json4s-native" % "3.6.7",
  // scala logging
  "com.typesafe.scala-logging" %% "scala-logging" % "3.9.0"
)

// Remove stub classes
assemblyMergeStrategy in assembly := {
  case PathList("org", "apache", "spark", "unused", "UnusedStubClass.class") => MergeStrategy.discard
  case x =>
    val oldStrategy = (assemblyMergeStrategy in assembly).value
    oldStrategy(x)
}

// Exclude the Scala runtime jars
assemblyOption in assembly := (assemblyOption in assembly).value.copy(includeScala = false)

resolvers ++= Seq(
  "Spray Repository" at "http://repo.spray.cc/",
  "Cloudera Repository" at "https://repository.cloudera.com/artifactory/cloudera-repos/",
  "Typesafe repository" at "http://repo.typesafe.com/typesafe/releases/",
  "Second Typesafe repo" at "http://repo.typesafe.com/typesafe/maven-releases/",
  "Mesosphere Public Repository" at "http://downloads.mesosphere.io/maven",
  Resolver.sonatypeRepo("public")
)

resolvers += Resolver.url("bintray-sbt-plugins", url("http://dl.bintray.com/sbt/sbt-plugin-releases"))(Resolver.ivyStylePatterns)
